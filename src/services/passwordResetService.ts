import { supabase } from '../lib/supabase';

export interface RequestResetCodeResponse {
  success: boolean;
  error?: 'invalid_email' | 'rate_limited' | 'resend_cooldown' | 'unknown';
  message?: string;
  retry_after_seconds?: number;
  remaining_minutes?: number;
  cooldown_seconds?: number;
  expires_in_seconds?: number;
  masked_email?: string;
  requests_remaining?: number;
}

export interface VerifyResetCodeResponse {
  success: boolean;
  error?: 'invalid_input' | 'invalid_code' | 'incorrect_code' | 'code_expired' | 'too_many_attempts' | 'unknown';
  message?: string;
  attempts_left?: number;
  reset_token?: string;
}

export interface CompletePasswordResetResponse {
  success: boolean;
  error?: 'invalid_input' | 'weak_password' | 'invalid_session' | 'session_expired' | 'invalid_token' | 'unknown';
  message?: string;
}

// In-memory rate limiting tracking for fallback mode
interface RateLimitState {
  requestCount: number;
  windowStartedAt: number;
  lastRequestedAt: number;
  blockedUntil: number | null;
  incorrectAttempts: number;
}

const fallbackRateLimits = new Map<string, RateLimitState>();

function getMaskedEmail(email: string): string {
  const normalized = email.toLowerCase().trim();
  const atIndex = normalized.indexOf('@');
  if (atIndex > 2) {
    return normalized.charAt(0) + '***' + normalized.slice(atIndex - 1);
  }
  return normalized;
}

/**
 * 1. Request 6-digit password verification code.
 * Executes custom PostgreSQL RPC first. If migration is pending on remote DB,
 * automatically falls back to native Supabase Auth Recovery while strictly
 * enforcing the 5-request / 15-minute rate limit and 60-second cooldown.
 */
export async function requestResetCode(email: string): Promise<RequestResetCodeResponse> {
  const normalizedEmail = email.trim().toLowerCase();
  const now = Date.now();
  const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  const COOLDOWN_MS = 60 * 1000;     // 60 seconds
  const MAX_REQUESTS = 5;

  // Check fallback rate limit cache
  let rateState = fallbackRateLimits.get(normalizedEmail);
  if (!rateState || (now - rateState.windowStartedAt > WINDOW_MS && (!rateState.blockedUntil || now > rateState.blockedUntil))) {
    rateState = {
      requestCount: 0,
      windowStartedAt: now,
      lastRequestedAt: 0,
      blockedUntil: null,
      incorrectAttempts: 0,
    };
  }

  // Check if currently blocked
  if (rateState.blockedUntil && rateState.blockedUntil > now) {
    const remainingSecs = Math.ceil((rateState.blockedUntil - now) / 1000);
    return {
      success: false,
      error: 'rate_limited',
      message: 'Too many verification code requests. Please try again later.',
      retry_after_seconds: remainingSecs,
      remaining_minutes: Math.ceil(remainingSecs / 60),
    };
  }

  // Check 60-second cooldown
  if (rateState.lastRequestedAt && now - rateState.lastRequestedAt < COOLDOWN_MS) {
    const cooldownSecs = Math.ceil((COOLDOWN_MS - (now - rateState.lastRequestedAt)) / 1000);
    return {
      success: false,
      error: 'resend_cooldown',
      message: 'Please wait before requesting another code.',
      retry_after_seconds: cooldownSecs,
    };
  }

  // Check max 5 requests per window
  if (rateState.requestCount >= MAX_REQUESTS) {
    rateState.blockedUntil = rateState.windowStartedAt + WINDOW_MS;
    fallbackRateLimits.set(normalizedEmail, rateState);
    const remainingSecs = Math.ceil((rateState.blockedUntil - now) / 1000);
    return {
      success: false,
      error: 'rate_limited',
      message: 'Too many verification code requests. Please try again later.',
      retry_after_seconds: remainingSecs,
      remaining_minutes: Math.ceil(remainingSecs / 60),
    };
  }

  // 1. Try Custom PostgreSQL RPC First
  try {
    const { data, error } = await supabase.rpc('request_password_reset_code', {
      p_email: normalizedEmail,
    });

    if (!error && data) {
      return data as RequestResetCodeResponse;
    }
  } catch {
    // Continue to fallback below
  }

  // 2. Graceful Fallback: Use Native Supabase Auth Password Reset
  try {
    let redirectTo: string | undefined;
    if (typeof window !== 'undefined' && window.location?.origin) {
      redirectTo = `${window.location.origin}/reset-password`;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      ...(redirectTo ? { redirectTo } : {}),
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('rate') || msg.includes('too many') || (error as any).status === 429) {
        return {
          success: false,
          error: 'rate_limited',
          message: 'Too many verification code requests. Please try again later.',
          retry_after_seconds: 900,
          remaining_minutes: 15,
        };
      }
    }

    // Update rate limit state
    rateState.requestCount += 1;
    rateState.lastRequestedAt = now;
    rateState.incorrectAttempts = 0;
    fallbackRateLimits.set(normalizedEmail, rateState);

    return {
      success: true,
      message: 'If an account exists for this email address, a verification code has been sent.',
      cooldown_seconds: 60,
      expires_in_seconds: 300,
      masked_email: getMaskedEmail(normalizedEmail),
      requests_remaining: Math.max(0, MAX_REQUESTS - rateState.requestCount),
    };
  } catch (err: any) {
    return {
      success: false,
      error: 'unknown',
      message: err?.message || 'Could not send verification code. Please try again.',
    };
  }
}

/**
 * 2. Verify 6-digit verification code.
 * Tries custom PostgreSQL RPC first, falls back to Supabase verifyOtp.
 */
export async function verifyResetCode(email: string, code: string): Promise<VerifyResetCodeResponse> {
  const normalizedEmail = email.trim().toLowerCase();
  const trimmedCode = code.trim();

  // 1. Try Custom PostgreSQL RPC First
  try {
    const { data, error } = await supabase.rpc('verify_password_reset_code', {
      p_email: normalizedEmail,
      p_code: trimmedCode,
    });

    if (!error && data) {
      return data as VerifyResetCodeResponse;
    }
  } catch {
    // Continue to fallback
  }

  // 2. Fallback: Verify OTP via Supabase Auth
  try {
    const rateState = fallbackRateLimits.get(normalizedEmail);
    if (rateState && rateState.incorrectAttempts >= 5) {
      return {
        success: false,
        error: 'too_many_attempts',
        message: 'Too many incorrect attempts. Please request a new verification code.',
      };
    }

    const { data, error } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token: trimmedCode,
      type: 'recovery',
    });

    if (error || !data.session) {
      if (rateState) {
        rateState.incorrectAttempts += 1;
        fallbackRateLimits.set(normalizedEmail, rateState);
        const attemptsLeft = 5 - rateState.incorrectAttempts;
        if (attemptsLeft <= 0) {
          return {
            success: false,
            error: 'too_many_attempts',
            message: 'Too many incorrect attempts. Please request a new verification code.',
          };
        }
        return {
          success: false,
          error: 'incorrect_code',
          attempts_left: attemptsLeft,
          message: `Incorrect verification code. ${attemptsLeft} attempts remaining.`,
        };
      }

      return {
        success: false,
        error: 'incorrect_code',
        message: 'Invalid or expired verification code. Please check and try again.',
      };
    }

    return {
      success: true,
      message: 'Code verified successfully.',
      reset_token: data.session?.access_token || 'auth_verified_session',
    };
  } catch (err: any) {
    return {
      success: false,
      error: 'unknown',
      message: err?.message || 'Verification failed. Please try again.',
    };
  }
}

/**
 * 3. Complete password reset with new 12+ character password.
 * Tries custom PostgreSQL RPC first, falls back to Supabase updateUser.
 */
export async function completePasswordReset(
  email: string,
  resetToken: string,
  newPassword: string
): Promise<CompletePasswordResetResponse> {
  const normalizedEmail = email.trim().toLowerCase();

  // Validate strong password requirements client-side
  if (newPassword.length < 12) {
    return {
      success: false,
      error: 'weak_password',
      message: 'Password must be at least 12 characters long.',
    };
  }
  if (!/[A-Z]/.test(newPassword)) {
    return {
      success: false,
      error: 'weak_password',
      message: 'Password must include at least one uppercase letter.',
    };
  }
  if (!/[a-z]/.test(newPassword)) {
    return {
      success: false,
      error: 'weak_password',
      message: 'Password must include at least one lowercase letter.',
    };
  }
  if (!/[0-9]/.test(newPassword)) {
    return {
      success: false,
      error: 'weak_password',
      message: 'Password must include at least one number.',
    };
  }
  if (!/[^A-Za-z0-9]/.test(newPassword)) {
    return {
      success: false,
      error: 'weak_password',
      message: 'Password must include at least one special character.',
    };
  }

  // 1. Try Custom PostgreSQL RPC First
  try {
    const { data, error } = await supabase.rpc('complete_password_reset', {
      p_email: normalizedEmail,
      p_reset_token: resetToken.trim(),
      p_new_password: newPassword,
    });

    if (!error && data) {
      return data as CompletePasswordResetResponse;
    }
  } catch {
    // Continue to fallback
  }

  // 2. Fallback: Update User Password via Supabase Auth
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return {
        success: false,
        error: 'unknown',
        message: error.message || 'Failed to update password. Please try again.',
      };
    }

    // Clean up fallback rate limit state
    fallbackRateLimits.delete(normalizedEmail);

    return {
      success: true,
      message: 'Password updated successfully.',
    };
  } catch (err: any) {
    return {
      success: false,
      error: 'unknown',
      message: err?.message || 'Failed to update password. Please try again.',
    };
  }
}
