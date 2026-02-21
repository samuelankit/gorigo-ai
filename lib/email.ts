import sgMail from "@sendgrid/mail";

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || process.env.SMTP_FROM || "noreply@gorigo.ai";

let initialized = false;

function initSendGrid(): boolean {
  if (initialized) return true;
  if (!SENDGRID_API_KEY) {
    console.warn("[Email] SendGrid API key not configured - emails will be logged to console instead");
    return false;
  }
  sgMail.setApiKey(SENDGRID_API_KEY);
  initialized = true;
  return true;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!initSendGrid()) {
    console.log(`[Email] Would send to: ${to}`);
    console.log(`[Email] Subject: ${subject}`);
    console.log(`[Email] Body logged (SendGrid not configured)`);
    return true;
  }
  try {
    await sgMail.send({
      to,
      from: { email: FROM_EMAIL, name: "GoRigo" },
      subject,
      html,
    });
    console.log(`[Email] Sent to ${to}: ${subject}`);
    return true;
  } catch (err: any) {
    const details = err?.response?.body?.errors || err.message;
    console.error(`[Email] Failed to send to ${to}:`, details);
    return false;
  }
}

export function isEmailConfigured(): boolean {
  return !!SENDGRID_API_KEY;
}

export async function sendVerificationEmail(
  email: string,
  token: string
): Promise<boolean> {
  const baseUrl = getBaseUrl();
  const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${token}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8faf9;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e2e8e5;">
    <div style="background:#189553;padding:32px 24px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">GoRigo</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">AI Call Centre Platform</p>
    </div>
    <div style="padding:32px 24px;">
      <h2 style="margin:0 0 8px;color:#1a2e22;font-size:20px;">Verify your email address</h2>
      <p style="margin:0 0 16px;color:#5c7268;">Please click the button below to verify your email address and activate your account.</p>
      <div style="margin:24px 0;text-align:center;">
        <a href="${verifyUrl}" style="display:inline-block;background:#189553;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:16px;">Verify Email</a>
      </div>
      <p style="margin:16px 0 0;color:#8fa49a;font-size:13px;">This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
      <p style="margin:8px 0 0;color:#8fa49a;font-size:12px;">Or copy this link: <a href="${verifyUrl}" style="color:#189553;">${verifyUrl}</a></p>
    </div>
    <div style="padding:16px 24px;background:#f8faf9;border-top:1px solid #e2e8e5;text-align:center;">
      <p style="margin:0;color:#8fa49a;font-size:12px;">GoRigo.ai - Powered by AI</p>
    </div>
  </div>
</body>
</html>`;

  return sendEmail(email, "Verify your email - GoRigo", html);
}

export async function sendPasswordResetEmail(
  email: string,
  token: string
): Promise<boolean> {
  const baseUrl = getBaseUrl();
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8faf9;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e2e8e5;">
    <div style="background:#189553;padding:32px 24px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">GoRigo</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">AI Call Centre Platform</p>
    </div>
    <div style="padding:32px 24px;">
      <h2 style="margin:0 0 8px;color:#1a2e22;font-size:20px;">Reset your password</h2>
      <p style="margin:0 0 16px;color:#5c7268;">We received a request to reset your password. Click the button below to set a new password.</p>
      <div style="margin:24px 0;text-align:center;">
        <a href="${resetUrl}" style="display:inline-block;background:#189553;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:16px;">Reset Password</a>
      </div>
      <p style="margin:16px 0 0;color:#8fa49a;font-size:13px;">This link expires in 1 hour. If you didn't request this, your account is secure — no changes have been made.</p>
      <p style="margin:8px 0 0;color:#8fa49a;font-size:12px;">Or copy this link: <a href="${resetUrl}" style="color:#189553;">${resetUrl}</a></p>
    </div>
    <div style="padding:16px 24px;background:#f8faf9;border-top:1px solid #e2e8e5;text-align:center;">
      <p style="margin:0;color:#8fa49a;font-size:12px;">GoRigo.ai - Powered by AI</p>
    </div>
  </div>
</body>
</html>`;

  return sendEmail(email, "Reset your password - GoRigo", html);
}

export async function sendInvitationEmail(
  email: string,
  token: string,
  orgName: string,
  role: string,
  departmentName?: string,
  invitedByName?: string
): Promise<boolean> {
  const baseUrl = getBaseUrl();
  const inviteUrl = `${baseUrl}/invite/${token}`;

  const deptLine = departmentName ? `<p style="margin:0 0 4px;color:#5c7268;">Department: <strong>${departmentName}</strong></p>` : "";
  const inviterLine = invitedByName ? `<p style="margin:0 0 16px;color:#5c7268;">${invitedByName} has invited you to join the team.</p>` : "";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8faf9;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e2e8e5;">
    <div style="background:#189553;padding:32px 24px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">GoRigo</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">AI Call Center Platform</p>
    </div>
    <div style="padding:32px 24px;">
      <h2 style="margin:0 0 8px;color:#1a2e22;font-size:20px;">You've been invited!</h2>
      ${inviterLine}
      <p style="margin:0 0 4px;color:#5c7268;">Organisation: <strong>${orgName}</strong></p>
      <p style="margin:0 0 4px;color:#5c7268;">Role: <strong>${role}</strong></p>
      ${deptLine}
      <div style="margin:24px 0;text-align:center;">
        <a href="${inviteUrl}" style="display:inline-block;background:#189553;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:16px;">Accept Invitation</a>
      </div>
      <p style="margin:16px 0 0;color:#8fa49a;font-size:13px;">This invitation expires in 7 days. If you didn't expect this email, you can safely ignore it.</p>
      <p style="margin:8px 0 0;color:#8fa49a;font-size:12px;">Or copy this link: <a href="${inviteUrl}" style="color:#189553;">${inviteUrl}</a></p>
    </div>
    <div style="padding:16px 24px;background:#f8faf9;border-top:1px solid #e2e8e5;text-align:center;">
      <p style="margin:0;color:#8fa49a;font-size:12px;">GoRigo.ai - Powered by AI</p>
    </div>
  </div>
</body>
</html>`;

  return sendEmail(email, `You're invited to join ${orgName} on GoRigo`, html);
}

export async function sendWelcomeEmail(
  email: string,
  businessName: string
): Promise<boolean> {
  const baseUrl = getBaseUrl();

  const termsUrl = `${baseUrl}/terms`;
  const slaUrl = `${baseUrl}/sla`;
  const dashboardUrl = `${baseUrl}/dashboard`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8faf9;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e2e8e5;">
    <div style="background:#189553;padding:32px 24px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">GoRigo</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">AI Call Centre Platform</p>
    </div>
    <div style="padding:32px 24px;">
      <h2 style="margin:0 0 8px;color:#1a2e22;font-size:20px;">Welcome to GoRigo, ${businessName}!</h2>
      <p style="margin:0 0 16px;color:#5c7268;">Thank you for creating your account. By signing up, you have agreed to the following documents. Please keep this email for your records.</p>

      <div style="background:#f0f7f3;border-radius:8px;padding:16px 20px;margin:0 0 20px;">
        <h3 style="margin:0 0 12px;color:#1a2e22;font-size:15px;font-weight:600;">Your Agreements</h3>
        <p style="margin:0 0 8px;color:#5c7268;font-size:14px;">
          <a href="${termsUrl}" style="color:#189553;font-weight:500;text-decoration:none;">Terms &amp; Conditions</a>
          <span style="color:#8fa49a;"> — Platform usage rules, data handling, and your rights</span>
        </p>
        <p style="margin:0 0 8px;color:#5c7268;font-size:14px;">
          <a href="${slaUrl}" style="color:#189553;font-weight:500;text-decoration:none;">Service Level Agreement (SLA)</a>
          <span style="color:#8fa49a;"> — Uptime guarantees, support response times, and compensation</span>
        </p>
      </div>

      <p style="margin:0 0 16px;color:#5c7268;font-size:14px;">These agreements are effective from the date of your registration and apply to all services provided through the GoRigo platform.</p>

      <div style="margin:24px 0;text-align:center;">
        <a href="${dashboardUrl}" style="display:inline-block;background:#189553;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:16px;">Go to Dashboard</a>
      </div>

      <p style="margin:16px 0 0;color:#8fa49a;font-size:13px;">If you did not create this account, please contact us immediately at support@gorigo.ai.</p>
    </div>
    <div style="padding:16px 24px;background:#f8faf9;border-top:1px solid #e2e8e5;text-align:center;">
      <p style="margin:0;color:#8fa49a;font-size:12px;">GoRigo.ai - Powered by AI</p>
    </div>
  </div>
</body>
</html>`;

  return sendEmail(email, "Welcome to GoRigo — Your Agreement & SLA Confirmation", html);
}

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  return "https://gorigo.ai";
}
