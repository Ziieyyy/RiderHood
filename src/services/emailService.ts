/**
 * RiderHood Resend Email Service
 * 
 * IMPORTANT: Replace 're_xxxxxxxxx' with your real Resend API Key
 * from https://resend.com/api-keys
 * 
 * You can also set EXPO_PUBLIC_RESEND_API_KEY in your .env file:
 * EXPO_PUBLIC_RESEND_API_KEY=re_your_real_key_here
 */

const RESEND_API_KEY = process.env.EXPO_PUBLIC_RESEND_API_KEY || 're_xxxxxxxxx';
const DEFAULT_FROM = 'RiderHood <onboarding@resend.dev>';

export interface SendEmailPayload {
  from?: string;
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Core function to send an email using the Resend API
 */
export async function sendEmail({
  from = DEFAULT_FROM,
  to,
  subject,
  html,
  text,
}: SendEmailPayload): Promise<SendEmailResult> {
  try {
    if (RESEND_API_KEY === 're_xxxxxxxxx') {
      console.warn(
        '[emailService] Please replace "re_xxxxxxxxx" with your real Resend API Key in src/services/emailService.ts or .env file.'
      );
    }

    const recipients = Array.isArray(to) ? to : [to];

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: recipients,
        subject,
        html,
        ...(text ? { text } : {}),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[emailService] Resend API Error:', data);
      return {
        success: false,
        error: data?.message || `HTTP ${response.status}: Failed to send email via Resend`,
      };
    }

    console.log('[emailService] Email sent successfully via Resend:', data);
    return {
      success: true,
      id: data?.id,
    };
  } catch (error: any) {
    console.error('[emailService] Network error sending email:', error);
    return {
      success: false,
      error: error?.message || 'Network error sending email via Resend.',
    };
  }
}

/**
 * Send 6-Digit Password Reset Verification Code Email
 */
export async function sendVerificationCodeEmail(
  toEmail: string,
  code: string
): Promise<SendEmailResult> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f17; color: #ffffff; padding: 20px; }
          .container { max-width: 500px; margin: 0 auto; background-color: #141b26; border-radius: 16px; border: 1px solid #232d3d; padding: 32px; text-align: center; }
          .logo { font-size: 24px; font-weight: 900; letter-spacing: 2px; color: #ffffff; margin-bottom: 4px; }
          .tagline { font-size: 11px; font-weight: 800; letter-spacing: 1px; color: #ff7a00; margin-bottom: 24px; }
          .title { font-size: 20px; font-weight: 800; color: #ffffff; margin-bottom: 12px; }
          .desc { font-size: 14px; color: #94a3b8; line-height: 1.5; margin-bottom: 24px; }
          .code-box { background-color: #070a0e; border: 2px solid #ff7a00; border-radius: 12px; padding: 18px; margin: 20px 0; }
          .otp-code { font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #ff7a00; font-family: monospace; }
          .expiry { font-size: 12px; color: #f59e0b; font-weight: 600; margin-top: 8px; }
          .footer { font-size: 12px; color: #64748b; margin-top: 32px; border-top: 1px solid #232d3d; padding-top: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">RIDERHOOD</div>
          <div class="tagline">PREMIUM MOTOR CARE</div>
          <div class="title">Password Reset Code</div>
          <div class="desc">
            You requested a password reset for your RiderHood account. Enter the 6-digit verification code below to proceed:
          </div>
          <div class="code-box">
            <div class="otp-code">${code}</div>
            <div class="expiry">Expires in 5 minutes</div>
          </div>
          <div class="desc" style="font-size: 12px; color: #64748b;">
            If you did not request this password reset, you can safely ignore this email.
          </div>
          <div class="footer">
            &copy; 2026 RiderHood Premium Motor Care. All rights reserved.
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: toEmail,
    subject: `Your RiderHood Verification Code: ${code}`,
    html,
  });
}

/**
 * Send Test Email (Matches initial testing snippet)
 */
export async function sendTestEmail(toEmail: string = 'riderhoodmotor@gmail.com') {
  return sendEmail({
    from: 'onboarding@resend.dev',
    to: toEmail,
    subject: 'Hello World from RiderHood',
    html: '<p>Congrats on sending your <strong>first email</strong> via Resend from RiderHood!</p>',
  });
}
