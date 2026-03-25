import html as html_lib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from core.config import settings
from utils.logging import get_logger

logger = get_logger("email_service")

try:
    import aiosmtplib
except ImportError:
    aiosmtplib = None


def _is_connect_timeout_error(error: Exception) -> bool:
    if aiosmtplib is None:
        return False

    timeout_error_types = tuple(
        err_type
        for err_type in (
            getattr(aiosmtplib.errors, "SMTPConnectTimeoutError", None),
            getattr(aiosmtplib.errors, "SMTPTimeoutError", None),
            TimeoutError,
        )
        if err_type is not None
    )
    return isinstance(error, timeout_error_types)


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
        logger.warning("[EMAIL] aiosmtplib not installed — skipping email notification")
        return

    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning("[EMAIL] SMTP credentials not configured — skipping email notification")
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

    msg = MIMEMultipart("alternative")
    msg["From"] = settings.SMTP_USER
    msg["To"] = recipient
    msg["Subject"] = subject
    msg.attach(MIMEText(plain_body, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    # Determine TLS mode (default: starttls)
    tls_mode = (getattr(settings, "SMTP_TLS_MODE", "starttls") or "starttls").lower().strip()

    start_tls = False
    use_tls = False

    if tls_mode == "starttls":
        start_tls = True
    elif tls_mode in ("tls", "ssl", "implicit_tls"):
        use_tls = True
    elif tls_mode in ("none", "plain", "off"):
        pass
    else:
        logger.warning("[EMAIL] Unknown SMTP_TLS_MODE '%s' — defaulting to STARTTLS", tls_mode)
        start_tls = True

    try:
        smtp_port = int(settings.SMTP_PORT)
    except (TypeError, ValueError):
        smtp_port = None

    if smtp_port is not None:
        if use_tls and smtp_port != 465:
            logger.warning(
                "[EMAIL] SMTP_TLS_MODE='%s' implies implicit TLS but SMTP_PORT=%s is not 465; check your configuration.",
                tls_mode, smtp_port,
            )
        if start_tls and smtp_port == 465:
            logger.warning(
                "[EMAIL] STARTTLS on port 465 is unusual; consider setting SMTP_TLS_MODE='tls' for implicit TLS.",
            )
        if not start_tls and not use_tls and smtp_port == 465:
            logger.warning(
                "[EMAIL] No TLS configured on port 465; consider adjusting SMTP_TLS_MODE.",
            )

    async def _send_email(
        port: int,
        *,
        start_tls_value: bool,
        use_tls_value: bool,
    ) -> None:
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=port,
            start_tls=start_tls_value,
            use_tls=use_tls_value,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            timeout=settings.SMTP_TIMEOUT_SECONDS,
        )

    try:
        await _send_email(
            settings.SMTP_PORT,
            start_tls_value=start_tls,
            use_tls_value=use_tls,
        )
        logger.info("[EMAIL] Alert sent to %s for violation %s", recipient, violation_id)
    except Exception as e:
        is_gmail_465 = (
            (settings.SMTP_HOST or "").strip().lower() == "smtp.gmail.com"
            and int(settings.SMTP_PORT) == 465
        )

        if is_gmail_465 and _is_connect_timeout_error(e):
            logger.warning(
                "[EMAIL] Timed out connecting to Gmail on port 465. Retrying on port 587 with STARTTLS. "
                "This usually means outbound port 465 is blocked by the VM provider, firewall, or network policy."
            )
            try:
                await _send_email(
                    587,
                    start_tls_value=True,
                    use_tls_value=False,
                )
                logger.info(
                    "[EMAIL] Alert sent to %s for violation %s using Gmail STARTTLS fallback on port 587",
                    recipient,
                    violation_id,
                )
                return
            except Exception as retry_error:
                logger.error(
                    "[EMAIL] Gmail fallback on port 587 also failed: %s. "
                    "Check SMTP credentials, App Password, and outbound SMTP rules on the VM.",
                    retry_error,
                )
                return

        logger.error(
            "[EMAIL] Failed to send alert: %s. Check SMTP_HOST/SMTP_PORT/SMTP_TLS_MODE, "
            "App Password configuration, and whether the VM allows outbound SMTP traffic.",
            e,
        )
