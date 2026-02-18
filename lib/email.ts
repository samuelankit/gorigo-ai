import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587", 10);
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_FROM = process.env.SMTP_FROM || "noreply@gorigo.ai";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn("[Email] SMTP not configured - emails will be logged to console instead");
    return null;
  }
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const transport = getTransporter();
  if (!transport) {
    console.log(`[Email] Would send to: ${to}`);
    console.log(`[Email] Subject: ${subject}`);
    console.log(`[Email] Body logged (SMTP not configured)`);
    return true;
  }
  try {
    await transport.sendMail({ from: SMTP_FROM, to, subject, html });
    console.log(`[Email] Sent to ${to}: ${subject}`);
    return true;
  } catch (err: any) {
    console.error(`[Email] Failed to send to ${to}:`, err.message);
    return false;
  }
}

export async function sendInvitationEmail(
  email: string,
  token: string,
  orgName: string,
  role: string,
  departmentName?: string,
  invitedByName?: string
): Promise<boolean> {
  let baseUrl = "https://gorigo.ai";
  if (process.env.NEXT_PUBLIC_APP_URL) {
    baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  } else if (process.env.REPLIT_DEV_DOMAIN) {
    baseUrl = `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
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
