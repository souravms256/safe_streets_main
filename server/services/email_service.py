from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from core.config import settings

try:
    import aiosmtplib
except ImportError:
    aiosmtplib = None


async def send_violation_alert_email(
    violation_type: str,
    address: str,
    short_address: str,
    location: str,
    timestamp: str,
    image_url: str,
    violation_id: str,
):
    """
    Send an email alert to the configured recipient when a new violation is reported.
    Runs as a background task — failures are logged but never crash the API.
    """
    if aiosmtplib is None:
        print("[EMAIL] aiosmtplib not installed — skipping email notification")
        return

    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print("[EMAIL] SMTP credentials not configured — skipping email notification")
        return

    recipient = settings.ALERT_RECIPIENT_EMAIL

    subject = f"🚨 New Violation Report: {violation_type}"

    html_body = f"""\
    <html>
    <body style="font-family: 'Segoe UI', Arial, sans-serif; background: #f4f6f8; padding: 20px;">
      <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 12px;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.08); overflow: hidden;">
        <div style="background: linear-gradient(135deg, #e53935, #d32f2f); padding: 24px 30px;">
          <h1 style="color: #fff; margin: 0; font-size: 22px;">🚨 Violation Report Alert</h1>
        </div>
        <div style="padding: 28px 30px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; color: #666; font-weight: 600; width: 140px;">Violation Type</td>
              <td style="padding: 10px 0; color: #222; font-weight: 700; font-size: 16px;">{violation_type}</td>
            </tr>
            <tr style="border-top: 1px solid #eee;">
              <td style="padding: 10px 0; color: #666; font-weight: 600;">Location</td>
              <td style="padding: 10px 0; color: #222;">{short_address}</td>
            </tr>
            <tr style="border-top: 1px solid #eee;">
              <td style="padding: 10px 0; color: #666; font-weight: 600;">Full Address</td>
              <td style="padding: 10px 0; color: #222; font-size: 13px;">{address}</td>
            </tr>
            <tr style="border-top: 1px solid #eee;">
              <td style="padding: 10px 0; color: #666; font-weight: 600;">Coordinates</td>
              <td style="padding: 10px 0; color: #222;">{location}</td>
            </tr>
            <tr style="border-top: 1px solid #eee;">
              <td style="padding: 10px 0; color: #666; font-weight: 600;">Reported At</td>
              <td style="padding: 10px 0; color: #222;">{timestamp}</td>
            </tr>
            <tr style="border-top: 1px solid #eee;">
              <td style="padding: 10px 0; color: #666; font-weight: 600;">Report ID</td>
              <td style="padding: 10px 0; color: #999; font-size: 12px;">{violation_id}</td>
            </tr>
          </table>

          <div style="margin-top: 24px; text-align: center;">
            <a href="{image_url}" style="display: inline-block; background: #1976d2; color: #fff;
               text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600;
               font-size: 14px;">View Evidence Image</a>
          </div>
        </div>
        <div style="background: #f9fafb; padding: 16px 30px; text-align: center;
                    border-top: 1px solid #eee; color: #999; font-size: 12px;">
          SafeStreets — AI-Powered Traffic Violation Detection
        </div>
      </div>
    </body>
    </html>
    """

    msg = MIMEMultipart("alternative")
    msg["From"] = settings.SMTP_USER
    msg["To"] = recipient
    msg["Subject"] = subject
    msg.attach(MIMEText(html_body, "html"))

    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            start_tls=True,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
        )
        print(f"[EMAIL] Alert sent to {recipient} for violation {violation_id}")
    except Exception as e:
        print(f"[EMAIL] Failed to send alert: {e}")
