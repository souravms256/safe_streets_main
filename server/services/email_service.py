import asyncio
import html as html_lib
import requests
from core.config import settings
from utils.logging import get_logger

logger = get_logger("email_service")

RESEND_SEND_EMAIL_URL = "https://api.resend.com/emails"


def _send_with_resend(payload: dict) -> dict:
    response = requests.post(
        RESEND_SEND_EMAIL_URL,
        headers={
            "Authorization": f"Bearer {settings.RESEND_API_KEY}",
            "Content-Type": "application/json",
            "User-Agent": "safe-streets-backend/1.0",
        },
        json=payload,
        timeout=settings.RESEND_TIMEOUT_SECONDS,
    )

    if not response.ok:
        raise RuntimeError(
            f"Resend API error {response.status_code}: {response.text}"
        )

    return response.json()


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
    if not settings.RESEND_API_KEY:
        logger.warning("[EMAIL] RESEND_API_KEY not configured — skipping email notification")
        return

    if not settings.RESEND_FROM_EMAIL:
        logger.warning("[EMAIL] RESEND_FROM_EMAIL not configured — skipping email notification")
        return

    recipient = (getattr(settings, "ALERT_RECIPIENT_EMAIL", "") or "").strip()
    if not recipient or "@" not in recipient:
        logger.warning("[EMAIL] Alert recipient email not configured or invalid — skipping email notification")
        return

    subject = f"🚨 New Violation Report: {violation_type}"

    # Escape all dynamic values to prevent HTML injection
    esc_violation_type = html_lib.escape(str(violation_type))
    esc_short_address = html_lib.escape(str(short_address))
    esc_address = html_lib.escape(str(address))
    esc_location = html_lib.escape(str(location))
    esc_timestamp = html_lib.escape(str(timestamp))
    esc_violation_id = html_lib.escape(str(violation_id))
    esc_image_url = html_lib.escape(str(image_url))

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
              <td style="padding: 10px 0; color: #222; font-weight: 700; font-size: 16px;">{esc_violation_type}</td>
            </tr>
            <tr style="border-top: 1px solid #eee;">
              <td style="padding: 10px 0; color: #666; font-weight: 600;">Location</td>
              <td style="padding: 10px 0; color: #222;">{esc_short_address}</td>
            </tr>
            <tr style="border-top: 1px solid #eee;">
              <td style="padding: 10px 0; color: #666; font-weight: 600;">Full Address</td>
              <td style="padding: 10px 0; color: #222; font-size: 13px;">{esc_address}</td>
            </tr>
            <tr style="border-top: 1px solid #eee;">
              <td style="padding: 10px 0; color: #666; font-weight: 600;">Coordinates</td>
              <td style="padding: 10px 0; color: #222;">{esc_location}</td>
            </tr>
            <tr style="border-top: 1px solid #eee;">
              <td style="padding: 10px 0; color: #666; font-weight: 600;">Reported At</td>
              <td style="padding: 10px 0; color: #222;">{esc_timestamp}</td>
            </tr>
            <tr style="border-top: 1px solid #eee;">
              <td style="padding: 10px 0; color: #666; font-weight: 600;">Report ID</td>
              <td style="padding: 10px 0; color: #999; font-size: 12px;">{esc_violation_id}</td>
            </tr>
          </table>

          <div style="margin-top: 24px; text-align: center;">
            <a href="{esc_image_url}" style="display: inline-block; background: #1976d2; color: #fff;
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

    plain_body = (
        f"Violation Report Alert\n\n"
        f"Violation Type: {violation_type}\n"
        f"Location: {short_address}\n"
        f"Full Address: {address}\n"
        f"Coordinates: {location}\n"
        f"Reported At: {timestamp}\n"
        f"Report ID: {violation_id}\n\n"
        f"View Evidence: {image_url}\n\n"
        f"SafeStreets — AI-Powered Traffic Violation Detection"
    )

    try:
        payload = {
            "from": settings.RESEND_FROM_EMAIL,
            "to": [recipient],
            "subject": subject,
            "html": html_body,
            "text": plain_body,
        }

        if settings.RESEND_REPLY_TO:
            payload["reply_to"] = [settings.RESEND_REPLY_TO]

        response_data = await asyncio.to_thread(
            _send_with_resend,
            payload,
        )
        logger.info(
            "[EMAIL] Alert sent to %s for violation %s via Resend (email_id=%s)",
            recipient,
            violation_id,
            response_data.get("id", "unknown"),
        )
    except Exception as e:
        logger.error(
            "[EMAIL] Failed to send alert via Resend: %s. Check RESEND_API_KEY, "
            "RESEND_FROM_EMAIL, domain verification, and Render environment variables.",
            e,
        )
