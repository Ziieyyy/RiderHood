-- ==============================================================================
-- RIDERHOOD SECURE PASSWORD RESET SYSTEM WITH 5-REQUEST RATE LIMITING
-- ==============================================================================

-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Password Reset Rate Limits Table (1 row per email_hash, updated in-place)
CREATE TABLE IF NOT EXISTS public.password_reset_limits (
  email_hash TEXT PRIMARY KEY,
  user_id UUID,
  request_count INT NOT NULL DEFAULT 1,
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  blocked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Password Reset Verifications Table (1 active verification per email_hash)
CREATE TABLE IF NOT EXISTS public.password_reset_verifications (
  email_hash TEXT PRIMARY KEY,
  user_id UUID,
  code_hash TEXT,
  expires_at TIMESTAMPTZ,
  attempt_count INT NOT NULL DEFAULT 0,
  verified_at TIMESTAMPTZ,
  reset_token_hash TEXT,
  reset_token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_pw_reset_limits_blocked ON public.password_reset_limits(blocked_until);
CREATE INDEX IF NOT EXISTS idx_pw_reset_verif_expires ON public.password_reset_verifications(expires_at);

-- Enable Row Level Security (RLS)
ALTER TABLE public.password_reset_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_verifications ENABLE ROW LEVEL SECURITY;

-- Deny direct client SELECT/INSERT/UPDATE/DELETE (All operations must run via SECURITY DEFINER functions)
DROP POLICY IF EXISTS "Deny direct public access to limits" ON public.password_reset_limits;
CREATE POLICY "Deny direct public access to limits"
  ON public.password_reset_limits FOR ALL
  TO public
  USING (false);

DROP POLICY IF EXISTS "Deny direct public access to verifications" ON public.password_reset_verifications;
CREATE POLICY "Deny direct public access to verifications"
  ON public.password_reset_verifications FOR ALL
  TO public
  USING (false);

-- ==============================================================================
-- FUNCTION 1: REQUEST PASSWORD RESET CODE (Max 5 requests / 15 min, 60s cooldown)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.request_password_reset_code(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_normalized_email TEXT;
  v_email_hash TEXT;
  v_user_id UUID;
  v_limit_record RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_window_interval INTERVAL := INTERVAL '15 minutes';
  v_cooldown_interval INTERVAL := INTERVAL '60 seconds';
  v_code_expiry_interval INTERVAL := INTERVAL '5 minutes';
  v_max_requests INT := 5;
  v_raw_code TEXT;
  v_code_hash TEXT;
  v_masked_email TEXT;
  v_remaining_seconds INT;
  v_at_idx INT;
BEGIN
  -- 1. Validate & Normalize Email
  IF p_email IS NULL OR trim(p_email) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_email', 'message', 'Please enter a valid email address.');
  END IF;

  v_normalized_email := lower(trim(p_email));
  v_email_hash := encode(digest(v_normalized_email, 'sha256'), 'hex');

  -- Create masked email for safe UI display (e.g. k***r@gmail.com)
  v_at_idx := position('@' in v_normalized_email);
  IF v_at_idx > 2 THEN
    v_masked_email := substring(v_normalized_email from 1 for 1) || '***' || substring(v_normalized_email from v_at_idx - 1);
  ELSE
    v_masked_email := v_normalized_email;
  END IF;

  -- 2. Lookup Rate Limits for this email_hash
  SELECT * INTO v_limit_record FROM public.password_reset_limits WHERE email_hash = v_email_hash FOR UPDATE;

  IF FOUND THEN
    -- Check if currently blocked
    IF v_limit_record.blocked_until IS NOT NULL AND v_limit_record.blocked_until > v_now THEN
      v_remaining_seconds := EXTRACT(EPOCH FROM (v_limit_record.blocked_until - v_now))::INT;
      RETURN jsonb_build_object(
        'success', false,
        'error', 'rate_limited',
        'message', 'Too many verification code requests. Please try again later.',
        'retry_after_seconds', v_remaining_seconds,
        'remaining_minutes', CEIL(v_remaining_seconds / 60.0)
      );
    END IF;

    -- Check resend cooldown (60 seconds between requests)
    IF v_limit_record.last_requested_at + v_cooldown_interval > v_now THEN
      v_remaining_seconds := EXTRACT(EPOCH FROM ((v_limit_record.last_requested_at + v_cooldown_interval) - v_now))::INT;
      RETURN jsonb_build_object(
        'success', false,
        'error', 'resend_cooldown',
        'message', 'Please wait before requesting another code.',
        'retry_after_seconds', v_remaining_seconds
      );
    END IF;

    -- Check if 15-minute window has expired
    IF v_limit_record.window_started_at + v_window_interval < v_now THEN
      -- Reset window
      UPDATE public.password_reset_limits
      SET request_count = 1,
          window_started_at = v_now,
          last_requested_at = v_now,
          blocked_until = NULL,
          updated_at = v_now
      WHERE email_hash = v_email_hash;
    ELSE
      -- Inside current window: check if exceeding limit
      IF v_limit_record.request_count >= v_max_requests THEN
        -- Block for remainder of window
        UPDATE public.password_reset_limits
        SET blocked_until = v_limit_record.window_started_at + v_window_interval,
            last_requested_at = v_now,
            updated_at = v_now
        WHERE email_hash = v_email_hash;

        v_remaining_seconds := EXTRACT(EPOCH FROM ((v_limit_record.window_started_at + v_window_interval) - v_now))::INT;
        RETURN jsonb_build_object(
          'success', false,
          'error', 'rate_limited',
          'message', 'Too many verification code requests. Please try again later.',
          'retry_after_seconds', v_remaining_seconds,
          'remaining_minutes', CEIL(v_remaining_seconds / 60.0)
        );
      ELSE
        -- Increment count
        UPDATE public.password_reset_limits
        SET request_count = v_limit_record.request_count + 1,
            last_requested_at = v_now,
            updated_at = v_now
        WHERE email_hash = v_email_hash;
      END IF;
    END IF;
  ELSE
    -- First request for this email hash -> create rate limit record
    INSERT INTO public.password_reset_limits (email_hash, request_count, window_started_at, last_requested_at, created_at, updated_at)
    VALUES (v_email_hash, 1, v_now, v_now, v_now, v_now);
  END IF;

  -- 3. Check if user exists in auth.users (Email enumeration protection)
  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = v_normalized_email LIMIT 1;

  IF v_user_id IS NULL THEN
    -- Return generic success without creating code to prevent account enumeration
    RETURN jsonb_build_object(
      'success', true,
      'message', 'If an account exists for this email address, a verification code has been sent.',
      'cooldown_seconds', 60,
      'expires_in_seconds', 300,
      'masked_email', v_masked_email,
      'requests_remaining', GREATEST(0, v_max_requests - COALESCE(v_limit_record.request_count + 1, 1))
    );
  END IF;

  -- 4. Generate Cryptographically Secure 6-Digit Verification Code (100000 - 999999)
  v_raw_code := lpad(((floor(random() * 900000) + 100000)::INT)::TEXT, 6, '0');

  -- Hash code with SHA-256 + salt
  v_code_hash := encode(digest(v_raw_code || v_email_hash || 'riderhood_salt_2026', 'sha256'), 'hex');

  -- 5. Upsert Verification Record (Only 1 active verification record per email_hash)
  INSERT INTO public.password_reset_verifications (
    email_hash,
    user_id,
    code_hash,
    expires_at,
    attempt_count,
    verified_at,
    reset_token_hash,
    reset_token_expires_at,
    created_at,
    updated_at
  )
  VALUES (
    v_email_hash,
    v_user_id,
    v_code_hash,
    v_now + v_code_expiry_interval,
    0,
    NULL,
    NULL,
    NULL,
    v_now,
    v_now
  )
  ON CONFLICT (email_hash) DO UPDATE
  SET user_id = v_user_id,
      code_hash = v_code_hash,
      expires_at = v_now + v_code_expiry_interval,
      attempt_count = 0,
      verified_at = NULL,
      reset_token_hash = NULL,
      reset_token_expires_at = NULL,
      updated_at = v_now;

  -- 6. Insert in-app notification for user
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    v_user_id,
    'security',
    'Password Reset Verification Code',
    'Your 6-digit RiderHood verification code is ' || v_raw_code || '. It expires in 5 minutes.',
    jsonb_build_object('code', v_raw_code, 'expires_at', (v_now + v_code_expiry_interval))
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'If an account exists for this email address, a verification code has been sent.',
    'cooldown_seconds', 60,
    'expires_in_seconds', 300,
    'masked_email', v_masked_email,
    'requests_remaining', GREATEST(0, v_max_requests - COALESCE(v_limit_record.request_count + 1, 1))
  );
END;
$$;


-- ==============================================================================
-- FUNCTION 2: VERIFY CODE (Max 5 incorrect attempts, 5 min expiry)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.verify_password_reset_code(p_email TEXT, p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_normalized_email TEXT;
  v_email_hash TEXT;
  v_verif_record RECORD;
  v_input_hash TEXT;
  v_reset_token TEXT;
  v_token_hash TEXT;
  v_now TIMESTAMPTZ := NOW();
  v_attempts_left INT;
BEGIN
  IF p_email IS NULL OR trim(p_email) = '' OR p_code IS NULL OR trim(p_code) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_input', 'message', 'Please enter all 6 digits.');
  END IF;

  v_normalized_email := lower(trim(p_email));
  v_email_hash := encode(digest(v_normalized_email, 'sha256'), 'hex');

  SELECT * INTO v_verif_record FROM public.password_reset_verifications WHERE email_hash = v_email_hash FOR UPDATE;

  IF NOT FOUND OR v_verif_record.code_hash IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_code', 'message', 'Invalid or expired verification code.');
  END IF;

  -- Check Expiration
  IF v_verif_record.expires_at < v_now THEN
    -- Clear expired code
    UPDATE public.password_reset_verifications SET code_hash = NULL WHERE email_hash = v_email_hash;
    RETURN jsonb_build_object('success', false, 'error', 'code_expired', 'message', 'Your verification code has expired. Please request a new code.');
  END IF;

  -- Check Attempt Limit (Max 5 attempts)
  IF v_verif_record.attempt_count >= 5 THEN
    UPDATE public.password_reset_verifications SET code_hash = NULL WHERE email_hash = v_email_hash;
    RETURN jsonb_build_object('success', false, 'error', 'too_many_attempts', 'message', 'Too many incorrect attempts. Please request a new verification code.');
  END IF;

  -- Compute Hash of User Input
  v_input_hash := encode(digest(trim(p_code) || v_email_hash || 'riderhood_salt_2026', 'sha256'), 'hex');

  IF v_input_hash <> v_verif_record.code_hash THEN
    -- Increment failed attempt count
    UPDATE public.password_reset_verifications
    SET attempt_count = v_verif_record.attempt_count + 1,
        updated_at = v_now
    WHERE email_hash = v_email_hash;

    v_attempts_left := 5 - (v_verif_record.attempt_count + 1);
    IF v_attempts_left <= 0 THEN
      UPDATE public.password_reset_verifications SET code_hash = NULL WHERE email_hash = v_email_hash;
      RETURN jsonb_build_object('success', false, 'error', 'too_many_attempts', 'message', 'Too many incorrect attempts. Please request a new verification code.');
    END IF;

    RETURN jsonb_build_object(
      'success', false,
      'error', 'incorrect_code',
      'attempts_left', v_attempts_left,
      'message', 'Incorrect verification code. ' || v_attempts_left || ' attempts remaining.'
    );
  END IF;

  -- Code is Valid -> Generate 64-char Cryptographic Single-Use Reset Token (10 min expiry)
  v_reset_token := encode(gen_random_bytes(32), 'hex');
  v_token_hash := encode(digest(v_reset_token || 'riderhood_token_salt_2026', 'sha256'), 'hex');

  UPDATE public.password_reset_verifications
  SET code_hash = NULL, -- Immediately invalidate code so it cannot be reused
      verified_at = v_now,
      reset_token_hash = v_token_hash,
      reset_token_expires_at = v_now + INTERVAL '10 minutes',
      updated_at = v_now
  WHERE email_hash = v_email_hash;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Code verified successfully.',
    'reset_token', v_reset_token
  );
END;
$$;


-- ==============================================================================
-- FUNCTION 3: COMPLETE PASSWORD RESET (Enforce 12+ chars, uppercase, lowercase, number, symbol)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.complete_password_reset(p_email TEXT, p_reset_token TEXT, p_new_password TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_normalized_email TEXT;
  v_email_hash TEXT;
  v_verif_record RECORD;
  v_token_hash TEXT;
  v_now TIMESTAMPTZ := NOW();
  v_pw_len INT;
BEGIN
  IF p_email IS NULL OR p_reset_token IS NULL OR p_new_password IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_input', 'message', 'Missing required parameters.');
  END IF;

  v_normalized_email := lower(trim(p_email));
  v_email_hash := encode(digest(v_normalized_email, 'sha256'), 'hex');
  v_pw_len := length(p_new_password);

  -- 1. Enforce Strong Password Policy
  -- Min 12 chars
  IF v_pw_len < 12 THEN
    RETURN jsonb_build_object('success', false, 'error', 'weak_password', 'message', 'Password must be at least 12 characters long.');
  END IF;

  -- Require Uppercase
  IF p_new_password !~ '[A-Z]' THEN
    RETURN jsonb_build_object('success', false, 'error', 'weak_password', 'message', 'Password must include at least one uppercase letter.');
  END IF;

  -- Require Lowercase
  IF p_new_password !~ '[a-z]' THEN
    RETURN jsonb_build_object('success', false, 'error', 'weak_password', 'message', 'Password must include at least one lowercase letter.');
  END IF;

  -- Require Digit
  IF p_new_password !~ '[0-9]' THEN
    RETURN jsonb_build_object('success', false, 'error', 'weak_password', 'message', 'Password must include at least one number.');
  END IF;

  -- Require Special Character
  IF p_new_password !~ '[^A-Za-z0-9]' THEN
    RETURN jsonb_build_object('success', false, 'error', 'weak_password', 'message', 'Password must include at least one special character.');
  END IF;

  -- 2. Verify Reset Token
  SELECT * INTO v_verif_record FROM public.password_reset_verifications WHERE email_hash = v_email_hash FOR UPDATE;

  IF NOT FOUND OR v_verif_record.reset_token_hash IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_session', 'message', 'Invalid or expired password reset session.');
  END IF;

  IF v_verif_record.reset_token_expires_at < v_now THEN
    UPDATE public.password_reset_verifications SET reset_token_hash = NULL WHERE email_hash = v_email_hash;
    RETURN jsonb_build_object('success', false, 'error', 'session_expired', 'message', 'Password reset session has expired. Please start over.');
  END IF;

  v_token_hash := encode(digest(trim(p_reset_token) || 'riderhood_token_salt_2026', 'sha256'), 'hex');

  IF v_token_hash <> v_verif_record.reset_token_hash THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_token', 'message', 'Invalid reset token.');
  END IF;

  -- 3. Update auth.users Password securely
  UPDATE auth.users
  SET encrypted_password = crypt(p_new_password, gen_salt('bf')),
      updated_at = v_now
  WHERE id = v_verif_record.user_id;

  -- 4. Clean up verification state (Single-use token consumed)
  UPDATE public.password_reset_verifications
  SET reset_token_hash = NULL,
      reset_token_expires_at = NULL,
      verified_at = NULL,
      updated_at = v_now
  WHERE email_hash = v_email_hash;

  -- 5. Insert security notification for the user
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    v_verif_record.user_id,
    'security',
    'Password Changed Successfully',
    'Your RiderHood password was updated successfully. If you did not perform this action, please contact support immediately.',
    jsonb_build_object('updated_at', v_now)
  );

  RETURN jsonb_build_object('success', true, 'message', 'Password updated successfully.');
END;
$$;


-- ==============================================================================
-- FUNCTION 4: PERIODIC CLEANUP (Removes limits and verifications older than 30 days)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_password_resets()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.password_reset_limits WHERE updated_at < NOW() - INTERVAL '30 days';
  DELETE FROM public.password_reset_verifications WHERE updated_at < NOW() - INTERVAL '30 days';
END;
$$;
