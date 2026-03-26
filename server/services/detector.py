import requests
from core.config import settings
from utils.logging import get_logger

logger = get_logger("detector")


class ViolationDetector:
    """
    Client for the Traffic-AI inference server (VM/Azure).
    Compatible with the updated app.py response schema.
    """

    @staticmethod
    def detect(image_bytes: bytes) -> tuple[str, dict, bytes]:
        try:
            files    = {"file": ("image.jpg", image_bytes, "image/jpeg")}
            response = requests.post(settings.MODEL_API_URL, files=files, timeout=60)  # ← increased timeout for OCR

            if response.status_code != 200:
                logger.error("Model API error: %s — %s", response.status_code, response.text)
                return (
                    "Detection Failed",
                    {"error": f"API Error {response.status_code}", "raw": response.text},
                    image_bytes,
                )

            try:
                data = response.json()
            except Exception as e:
                logger.error("Failed to parse JSON response: %s", e)
                return "Detection Failed", {"error": "JSON parse error", "raw": response.text}, image_bytes

            logger.info("Raw model response: %s", data)

            # ── Parse violations ────────────────────────────────────────────
            violations_data = data.get("violations", {})
            detections_data = data.get("detections", {})
            road_data       = data.get("road_condition", {})
            anpr_data       = data.get("anpr", {})          # ← NEW

            # Helmet violations
            helmet_violations = int(
                violations_data.get("helmet_violations")
                or data.get("helmet_violations", 0)
                or 0
            )

            # Triple riding
            triple_riding = bool(
                violations_data.get("triple_riding")
                or data.get("triple_riding", False)
            )

            # Max riders
            max_riders = int(
                violations_data.get("max_riders_on_bike")
                or data.get("riders", 0)
                or 0
            )

            # Rider count for display
            rider_count = int(
                detections_data.get("riders_on_bikes")
                or data.get("riders", 0)
                or 0
            )

            # Potholes
            pothole_count = int(
                road_data.get("pothole_count")
                or data.get("potholes", 0)
                or 0
            )

            # ── ANPR ────────────────────────────────────────────────────────
            # ← NEW: extract plate numbers
            plates = anpr_data.get("plates", [])
            plate_numbers = [
                p["plate_number"] for p in plates
                if p.get("plate_number") and p["plate_number"] != "UNKNOWN"
            ]
            valid_plates = [
                p["plate_number"] for p in plates
                if p.get("valid_format") is True
            ]

            # ── Build violation label ───────────────────────────────────────
            violations = []

            if triple_riding:
                label = f"Triple Riding ({max_riders} riders)" if max_riders > 0 else "Triple Riding"
                violations.append(label)

            if helmet_violations == 1:
                violations.append("Helmet Violation")
            elif helmet_violations > 1:
                violations.append(f"{helmet_violations} Helmet Violations")

            if pothole_count > 0:
                violations.append("Pothole" if pothole_count == 1 else f"{pothole_count} Potholes")

            violation_type = ", ".join(violations) if violations else "No Violation"

            # ── Normalise data dict for frontend ────────────────────────────
            data["helmet_violations"]  = helmet_violations
            data["triple_riding"]      = triple_riding
            data["max_riders_on_bike"] = max_riders
            data["potholes_detected"]  = pothole_count
            data["rider_count"]        = rider_count

            # ← NEW: expose plate data cleanly for frontend
            data["plate_numbers"]      = plate_numbers        # e.g. ["TS 23 B 0770"]
            data["valid_plates"]       = valid_plates         # only correctly formatted ones
            data["plates_detected"]    = len(plates)

            # Flatten all bounding box detections into one list for the map overlay
            all_detections: list = []

            helmet_dets  = detections_data.get("helmet_detections", [])
            bike_dets    = detections_data.get("motorcycles", [])
            pothole_dets = road_data.get("potholes", [])

            for d in helmet_dets:
                d.setdefault("class", "helmet")
                all_detections.append(d)

            for d in bike_dets:
                d.setdefault("class", d.get("class_raw", "motorcycle"))
                all_detections.append(d)

            for d in pothole_dets:
                d.setdefault("class", "pothole")
                all_detections.append(d)

            # ← NEW: add plate bboxes to detections overlay
            for p in plates:
                all_detections.append({
                    "class":      "license_plate",
                    "confidence": p.get("confidence", 0),
                    "bbox":       p.get("bbox", []),
                    "text":       p.get("plate_number", ""),
                })

            data["detections"] = all_detections

            # ── Fetch annotated image ───────────────────────────────────────
            annotated_image_bytes = image_bytes

            output_url = data.get("output", {}).get("url")
            if output_url:
                base_url           = settings.MODEL_API_URL.rsplit("/", 1)[0]
                full_annotated_url = f"{base_url}{output_url}"
                logger.info("Fetching annotated image from: %s", full_annotated_url)
                try:
                    img_res = requests.get(full_annotated_url, timeout=10)
                    if img_res.status_code == 200:
                        annotated_image_bytes = img_res.content
                        logger.info("Annotated image fetched (%d bytes)", len(annotated_image_bytes))
                    else:
                        logger.warning("Annotated image fetch failed: HTTP %s", img_res.status_code)
                except Exception as e:
                    logger.warning("Could not fetch annotated image: %s", e)

            return violation_type, data, annotated_image_bytes

        except requests.exceptions.Timeout:
            logger.error("Model API timed out")
            return "AI Service Unavailable", {"error": "Timeout"}, image_bytes

        except Exception as e:
            logger.exception("Unexpected error calling AI model: %s", e)
            return "AI Service Unavailable", {}, image_bytes


detector = ViolationDetector()