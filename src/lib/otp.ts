import 'server-only';

/**
 * Sends a sign-in code by SMS or WhatsApp.
 * - Development (`next dev`): the code is printed in the server log — nothing is sent.
 * - Production: needs a provider. Supported now: Twilio (SMS or WhatsApp sender). Without one, sign-in stays hidden.
 *
 * Environment variables for production:
 *   OTP_PROVIDER=twilio
 *   TWILIO_ACCOUNT_SID=ACxxxxxxxx
 *   TWILIO_AUTH_TOKEN=xxxxxxxx
 *   TWILIO_FROM=+1xxxxxxxxxx  (SMS sender)  or  whatsapp:+971xxxxxxxxx  (approved WhatsApp sender)
 */
export function otpProviderConfigured() {
  return process.env.OTP_PROVIDER === 'twilio' && !!process.env.TWILIO_ACCOUNT_SID && !!process.env.TWILIO_AUTH_TOKEN && !!process.env.TWILIO_FROM;
}

export const otpAvailable = () => process.env.NODE_ENV !== 'production' || otpProviderConfigured();

export async function sendOtp(phone: string, code: string, lang: 'ar' | 'en' = 'ar'): Promise<boolean> {
  const text = lang === 'ar'
    ? `رمز الدخول إلى البدع: ${code}\nصالح لمدة 5 دقائق. لا تشاركه مع أحد.`
    : `Your Albada sign-in code: ${code}\nValid for 5 minutes. Do not share it.`;

  if (process.env.NODE_ENV !== 'production' && !otpProviderConfigured()) {
    console.info(`[otp] code for ${phone}: ${code}`);
    return true;
  }
  if (!otpProviderConfigured()) return false;

  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const from = process.env.TWILIO_FROM!;
  const to = from.startsWith('whatsapp:') ? `whatsapp:${phone}` : phone;
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        authorization: `Basic ${Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ From: from, To: to, Body: text }),
    });
    if (!res.ok) console.error('[otp] provider error', res.status);
    return res.ok;
  } catch (e) {
    console.error('[otp] send failed', e);
    return false;
  }
}
