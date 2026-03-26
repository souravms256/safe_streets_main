import base64
import json
import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any

import requests

from core.config import settings
from utils.logging import get_logger

logger = get_logger("detector")


class DetectorError(Exception):
    """Base detector error."""


class PrimaryDetectorError(DetectorError):
    """Raised when the primary model API fails."""


class ClaudeDetectorError(DetectorError):
    """Raised when the Claude detector fails."""


class ViolationDetector:
    """
    Client for the Traffic-AI inference server (VM/Azure).
    Compatible with the updated app.py response schema.
    """

    CLAUDE_TOOL_NAME = "report_traffic_violation_assessment"
    INDIAN_PLATE_PATTERN = re.compile(r"^[A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,3}\s?\d{4}$")
    TRUE_VALUES = {"1", "true", "yes", "y"}
    CLAUDE_SYSTEM_PROMPT = (
        "You are a traffic-violation analyst for an Indian road-safety application. "
        "Inspect the image conservatively and return the assessment only through the provided tool."
    )
    CLAUDE_USER_PROMPT = (
        "Analyze this single road image. Focus on helmet violations on two-wheelers, triple riding, "
        "possible no-parking violations, rider counts, and visible vehicle number plates. "
        "Rules: count only clearly visible riders on motorcycles or scooters; triple_riding is true only "
        "when 3 or more people are on the same two-wheeler; no_parking is true only when the vehicle appears "
        "parked or stopped in a clearly improper place or with visible no-parking context; if uncertain, be "
        "conservative. Return uppercase plate text only when it is legible."
    )

    @staticmethod
    def detect(image_bytes: bytes) -> tuple[str, dict, bytes]:
        if settings.CLAUDE_PARALLEL_ENABLED:
            if settings.ANTHROPIC_API_KEY:
                logger.info("Running primary model API and Claude in parallel")
                return ViolationDetector._detect_in_parallel(image_bytes)
            logger.warning(
                "Claude parallel detection is enabled but ANTHROPIC_API_KEY is missing; using primary detector only"
            )

        primary_error: Exception | None = None
        try:
            return ViolationDetector._detect_with_primary_model(image_bytes)
        except requests.exceptions.Timeout as exc:
            primary_error = exc
            logger.error("Model API timed out")
        except PrimaryDetectorError as exc:
            primary_error = exc
            logger.error("Model API failed: %s", exc)
        except Exception as exc:
            primary_error = exc
            logger.exception("Unexpected error calling primary AI model: %s", exc)

        return ViolationDetector._failure_response(primary_error, image_bytes)

    @staticmethod
    def _detect_in_parallel(image_bytes: bytes) -> tuple[str, dict, bytes]:
        primary_result: tuple[str, dict, bytes] | None = None
        claude_result: tuple[str, dict, bytes] | None = None
        primary_error: Exception | None = None
        claude_error: Exception | None = None
        started_at = time.perf_counter()
        timings: dict[str, float] = {}

        with ThreadPoolExecutor(max_workers=2) as executor:
            primary_submitted_at = time.perf_counter()
            claude_submitted_at = time.perf_counter()
            future_map = {
                executor.submit(
                    ViolationDetector._detect_with_primary_model,
                    image_bytes,
                ): ("primary_model_api", primary_submitted_at),
                executor.submit(
                    ViolationDetector._detect_with_claude,
                    image_bytes,
                ): ("claude_parallel", claude_submitted_at),
            }

            for future in as_completed(future_map):
                detector_name, detector_submitted_at = future_map[future]
                try:
                    result = future.result()
                except Exception as exc:
                    timings[detector_name] = time.perf_counter() - detector_submitted_at
                    ViolationDetector._log_detector_error(detector_name, exc)
                    if detector_name == "primary_model_api":
                        primary_error = exc
                    else:
                        claude_error = exc
                    continue
                timings[detector_name] = time.perf_counter() - detector_submitted_at

                if detector_name == "primary_model_api":
                    primary_result = result
                else:
                    claude_result = result

        if primary_result and claude_result:
            merged_result = ViolationDetector._merge_detector_results(
                primary_result,
                claude_result,
            )
            logger.info(
                "Parallel detector merge complete | total=%.2fs | primary=%.2fs | claude=%.2fs",
                time.perf_counter() - started_at,
                timings.get("primary_model_api", 0.0),
                timings.get("claude_parallel", 0.0),
            )
            return merged_result

        if primary_result:
            logger.info(
                "Parallel detector completed with primary only | total=%.2fs | primary=%.2fs | claude_failed=%s",
                time.perf_counter() - started_at,
                timings.get("primary_model_api", 0.0),
                bool(claude_error),
            )
            return primary_result

        if claude_result:
            violation_type, data, annotated_image_bytes = claude_result
            data = dict(data)
            data["detector_source"] = "claude_only"
            data["detector_sources"] = ["claude_parallel"]
            logger.info(
                "Parallel detector completed with Claude only | total=%.2fs | claude=%.2fs | primary_failed=%s",
                time.perf_counter() - started_at,
                timings.get("claude_parallel", 0.0),
                bool(primary_error),
            )
            return violation_type, data, annotated_image_bytes

        logger.warning(
            "Parallel detector failed | total=%.2fs | primary_failed=%s | claude_failed=%s",
            time.perf_counter() - started_at,
            bool(primary_error),
            bool(claude_error),
        )
        return ViolationDetector._failure_response(
            primary_error,
            image_bytes,
            claude_error=claude_error,
        )

    @staticmethod
    def _detect_with_primary_model(image_bytes: bytes) -> tuple[str, dict, bytes]:
        files = {
            "file": (
                "image.jpg",
                image_bytes,
                ViolationDetector._detect_media_type(image_bytes),
            )
        }
        response = requests.post(settings.MODEL_API_URL, files=files, timeout=60)

        if response.status_code != 200:
            raise PrimaryDetectorError(
                f"API Error {response.status_code}: {response.text[:500]}"
            )

        try:
            data = response.json()
        except Exception as exc:
            raise PrimaryDetectorError(
                f"JSON parse error: {exc}. Raw response: {response.text[:500]}"
            ) from exc

        logger.info("Raw model response: %s", data)

        annotated_image_bytes = ViolationDetector._fetch_annotated_image(data, image_bytes)
        return ViolationDetector._normalize_result(
            data=data,
            annotated_image_bytes=annotated_image_bytes,
            source="primary_model_api",
        )

    @staticmethod
    def _detect_with_claude(image_bytes: bytes) -> tuple[str, dict, bytes]:
        payload = {
            "model": settings.CLAUDE_MODEL,
            "max_tokens": settings.CLAUDE_MAX_TOKENS,
            "temperature": 0,
            "system": ViolationDetector.CLAUDE_SYSTEM_PROMPT,
            "tools": [
                {
                    "name": ViolationDetector.CLAUDE_TOOL_NAME,
                    "description": "Return a structured traffic-violation assessment for one road image.",
                    "input_schema": {
                        "type": "object",
                        "properties": {
                            "helmet_violations": {"type": "integer", "minimum": 0},
                            "triple_riding": {"type": "boolean"},
                            "rider_count": {"type": "integer", "minimum": 0},
                            "max_riders_on_bike": {"type": "integer", "minimum": 0},
                            "no_parking": {"type": "boolean"},
                            "plate_numbers": {
                                "type": "array",
                                "items": {"type": "string"},
                            },
                            "analysis_summary": {"type": "string"},
                        },
                        "required": [
                            "helmet_violations",
                            "triple_riding",
                            "rider_count",
                            "max_riders_on_bike",
                            "no_parking",
                            "plate_numbers",
                            "analysis_summary",
                        ],
                        "additionalProperties": False,
                    },
                }
            ],
            "tool_choice": {
                "type": "tool",
                "name": ViolationDetector.CLAUDE_TOOL_NAME,
            },
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": ViolationDetector._detect_media_type(image_bytes),
                                "data": base64.b64encode(image_bytes).decode("utf-8"),
                            },
                        },
                        {
                            "type": "text",
                            "text": ViolationDetector.CLAUDE_USER_PROMPT,
                        },
                    ],
                }
            ],
        }

        headers = {
            "x-api-key": settings.ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }

        response = requests.post(
            settings.ANTHROPIC_API_URL,
            headers=headers,
            json=payload,
            timeout=settings.CLAUDE_TIMEOUT_SECONDS,
        )

        if response.status_code != 200:
            raise ClaudeDetectorError(
                f"Claude API Error {response.status_code}: {response.text[:500]}"
            )

        try:
            response_data = response.json()
        except Exception as exc:
            raise ClaudeDetectorError(
                f"Claude response JSON parse error: {exc}. Raw response: {response.text[:500]}"
            ) from exc

        logger.info("Claude detector response: %s", response_data)

        assessment = ViolationDetector._extract_claude_assessment(response_data)

        rider_count = ViolationDetector._safe_int(assessment.get("rider_count"))
        max_riders = ViolationDetector._safe_int(
            assessment.get("max_riders_on_bike"),
            rider_count,
        )

        claude_data = {
            "helmet_violations": ViolationDetector._safe_int(
                assessment.get("helmet_violations")
            ),
            "triple_riding": ViolationDetector._as_bool(
                assessment.get("triple_riding")
            ),
            "rider_count": max(rider_count, max_riders),
            "max_riders_on_bike": max_riders,
            "no_parking": ViolationDetector._as_bool(assessment.get("no_parking")),
            "plate_numbers": ViolationDetector._normalize_plate_list(
                assessment.get("plate_numbers")
            ),
            "analysis_summary": str(assessment.get("analysis_summary", "")).strip(),
            "detections": [],
        }

        return ViolationDetector._normalize_result(
            data=claude_data,
            annotated_image_bytes=image_bytes,
            source="claude_parallel",
        )

    @staticmethod
    def _merge_detector_results(
        primary_result: tuple[str, dict, bytes],
        claude_result: tuple[str, dict, bytes],
    ) -> tuple[str, dict, bytes]:
        _, primary_data, annotated_image_bytes = primary_result
        _, claude_data, _ = claude_result

        merged = dict(primary_data)
        primary_snapshot = {
            "helmet_violations": ViolationDetector._safe_int(
                primary_data.get("helmet_violations")
            ),
            "triple_riding": ViolationDetector._as_bool(
                primary_data.get("triple_riding")
            ),
            "rider_count": ViolationDetector._safe_int(primary_data.get("rider_count")),
            "max_riders_on_bike": ViolationDetector._safe_int(
                primary_data.get("max_riders_on_bike")
            ),
            "no_parking": ViolationDetector._as_bool(primary_data.get("no_parking")),
        }
        claude_snapshot = {
            "helmet_violations": ViolationDetector._safe_int(
                claude_data.get("helmet_violations")
            ),
            "triple_riding": ViolationDetector._as_bool(
                claude_data.get("triple_riding")
            ),
            "rider_count": ViolationDetector._safe_int(claude_data.get("rider_count")),
            "max_riders_on_bike": ViolationDetector._safe_int(
                claude_data.get("max_riders_on_bike")
            ),
            "no_parking": ViolationDetector._as_bool(claude_data.get("no_parking")),
        }

        if primary_snapshot != claude_snapshot:
            logger.warning(
                "Detector disagreement resolved in favor of Claude | primary=%s | claude=%s",
                primary_snapshot,
                claude_snapshot,
            )

        merged_plate_numbers = ViolationDetector._dedupe_preserving_order(
            ViolationDetector._normalize_plate_list(primary_data.get("plate_numbers"))
            + ViolationDetector._normalize_plate_list(claude_data.get("plate_numbers"))
        )
        merged_valid_plates = ViolationDetector._dedupe_preserving_order(
            ViolationDetector._normalize_plate_list(primary_data.get("valid_plates"))
            + ViolationDetector._normalize_plate_list(claude_data.get("valid_plates"))
            + [
                plate
                for plate in merged_plate_numbers
                if ViolationDetector._is_valid_plate_number(plate)
            ]
        )

        merged["helmet_violations"] = ViolationDetector._safe_int(
            claude_data.get("helmet_violations"),
            primary_data.get("helmet_violations"),
        )
        merged["triple_riding"] = ViolationDetector._as_bool(
            claude_data.get("triple_riding"),
            primary_data.get("triple_riding"),
        )
        merged["max_riders_on_bike"] = ViolationDetector._safe_int(
            claude_data.get("max_riders_on_bike"),
            primary_data.get("max_riders_on_bike"),
        )
        merged["rider_count"] = max(
            ViolationDetector._safe_int(claude_data.get("rider_count")),
            ViolationDetector._safe_int(merged.get("max_riders_on_bike")),
            ViolationDetector._safe_int(primary_data.get("rider_count")),
        )
        merged["no_parking"] = ViolationDetector._as_bool(
            claude_data.get("no_parking"),
            primary_data.get("no_parking"),
        )
        merged["potholes_detected"] = ViolationDetector._safe_int(
            primary_data.get("potholes_detected"),
            ViolationDetector._safe_int(claude_data.get("potholes_detected")),
        )
        merged["plate_numbers"] = merged_plate_numbers
        merged["valid_plates"] = merged_valid_plates
        merged["plates_detected"] = len(merged_plate_numbers)
        merged["analysis_summary"] = str(
            claude_data.get("analysis_summary")
            or primary_data.get("analysis_summary")
            or ""
        ).strip()
        merged["detector_source"] = "parallel_ensemble"
        merged["detector_sources"] = ["primary_model_api", "claude_parallel"]
        merged["detector_resolution"] = "claude_preferred_semantics"

        violation_type = ViolationDetector._build_violation_type(
            helmet_violations=ViolationDetector._safe_int(
                merged.get("helmet_violations")
            ),
            triple_riding=ViolationDetector._as_bool(merged.get("triple_riding")),
            max_riders=ViolationDetector._safe_int(merged.get("max_riders_on_bike")),
            pothole_count=ViolationDetector._safe_int(
                merged.get("potholes_detected")
            ),
            no_parking=ViolationDetector._as_bool(merged.get("no_parking")),
        )

        return violation_type, merged, annotated_image_bytes

    @staticmethod
    def _log_detector_error(detector_name: str, error: Exception) -> None:
        if detector_name == "primary_model_api":
            if isinstance(error, requests.exceptions.Timeout):
                logger.error("Model API timed out")
            elif isinstance(error, PrimaryDetectorError):
                logger.error("Model API failed: %s", error)
            else:
                logger.exception("Unexpected error calling primary AI model: %s", error)
            return

        if isinstance(error, requests.exceptions.Timeout):
            logger.error("Claude detector timed out")
        elif isinstance(error, ClaudeDetectorError):
            logger.error("Claude detector failed: %s", error)
        else:
            logger.exception("Unexpected error calling Claude detector: %s", error)

    @staticmethod
    def _extract_claude_assessment(response_data: dict[str, Any]) -> dict[str, Any]:
        for block in response_data.get("content", []):
            if (
                isinstance(block, dict)
                and block.get("type") == "tool_use"
                and block.get("name") == ViolationDetector.CLAUDE_TOOL_NAME
                and isinstance(block.get("input"), dict)
            ):
                return block["input"]

        text_response = ViolationDetector._extract_text_response(response_data)
        if text_response:
            try:
                return ViolationDetector._extract_json_object(text_response)
            except json.JSONDecodeError as exc:
                raise ClaudeDetectorError(
                    f"Claude returned unparseable assessment text: {text_response[:500]}"
                ) from exc

        raise ClaudeDetectorError("Claude response did not include a structured assessment")

    @staticmethod
    def _normalize_result(
        data: dict[str, Any],
        annotated_image_bytes: bytes,
        source: str,
    ) -> tuple[str, dict, bytes]:
        normalized = dict(data)
        violations_data = (
            normalized.get("violations")
            if isinstance(normalized.get("violations"), dict)
            else {}
        )
        detections_data = normalized.get("detections")
        road_data = (
            normalized.get("road_condition")
            if isinstance(normalized.get("road_condition"), dict)
            else {}
        )
        anpr_data = (
            normalized.get("anpr")
            if isinstance(normalized.get("anpr"), dict)
            else {}
        )

        helmet_violations = ViolationDetector._safe_int(
            violations_data.get("helmet_violations"),
            normalized.get("helmet_violations"),
        )
        triple_riding = ViolationDetector._as_bool(
            violations_data.get("triple_riding"),
            normalized.get("triple_riding"),
        )
        max_riders = ViolationDetector._safe_int(
            violations_data.get("max_riders_on_bike"),
            normalized.get("max_riders_on_bike"),
            normalized.get("riders"),
            normalized.get("rider_count"),
        )
        rider_count = ViolationDetector._safe_int(
            detections_data.get("riders_on_bikes")
            if isinstance(detections_data, dict)
            else None,
            normalized.get("rider_count"),
            normalized.get("riders"),
            max_riders,
        )
        rider_count = max(rider_count, max_riders)

        pothole_count = ViolationDetector._safe_int(
            road_data.get("pothole_count"),
            normalized.get("potholes"),
            normalized.get("potholes_detected"),
        )
        no_parking = ViolationDetector._as_bool(
            violations_data.get("no_parking"),
            normalized.get("no_parking"),
        )

        plates = anpr_data.get("plates", []) if isinstance(anpr_data.get("plates"), list) else []
        plate_numbers = ViolationDetector._extract_plate_numbers(
            plates=plates,
            fallback_plate_numbers=normalized.get("plate_numbers"),
        )
        valid_plates = ViolationDetector._extract_valid_plates(
            plates=plates,
            plate_numbers=plate_numbers,
        )

        violation_type = ViolationDetector._build_violation_type(
            helmet_violations=helmet_violations,
            triple_riding=triple_riding,
            max_riders=max_riders,
            pothole_count=pothole_count,
            no_parking=no_parking,
        )

        normalized["helmet_violations"] = helmet_violations
        normalized["triple_riding"] = triple_riding
        normalized["max_riders_on_bike"] = max_riders
        normalized["potholes_detected"] = pothole_count
        normalized["rider_count"] = rider_count
        normalized["no_parking"] = no_parking
        normalized["plate_numbers"] = plate_numbers
        normalized["valid_plates"] = valid_plates
        normalized["plates_detected"] = len(plate_numbers)
        normalized["detector_source"] = source
        normalized["detections"] = ViolationDetector._flatten_detections(
            detections_data=detections_data,
            road_data=road_data,
            plates=plates,
        )

        return violation_type, normalized, annotated_image_bytes

    @staticmethod
    def _fetch_annotated_image(data: dict[str, Any], image_bytes: bytes) -> bytes:
        annotated_image_bytes = image_bytes
        output = data.get("output")
        output_url = output.get("url") if isinstance(output, dict) else None

        if not output_url:
            return annotated_image_bytes

        base_url = settings.MODEL_API_URL.rsplit("/", 1)[0]
        full_annotated_url = f"{base_url}{output_url}"
        logger.info("Fetching annotated image from: %s", full_annotated_url)
        try:
            img_res = requests.get(full_annotated_url, timeout=10)
            if img_res.status_code == 200:
                annotated_image_bytes = img_res.content
                logger.info(
                    "Annotated image fetched (%d bytes)",
                    len(annotated_image_bytes),
                )
            else:
                logger.warning(
                    "Annotated image fetch failed: HTTP %s",
                    img_res.status_code,
                )
        except Exception as exc:
            logger.warning("Could not fetch annotated image: %s", exc)

        return annotated_image_bytes

    @staticmethod
    def _flatten_detections(
        detections_data: Any,
        road_data: dict[str, Any],
        plates: list[Any],
    ) -> list[dict[str, Any]]:
        if isinstance(detections_data, list):
            return [d for d in detections_data if isinstance(d, dict)]

        if not isinstance(detections_data, dict):
            return []

        all_detections: list[dict[str, Any]] = []

        helmet_dets = detections_data.get("helmet_detections", [])
        bike_dets = detections_data.get("motorcycles", [])
        pothole_dets = road_data.get("potholes", [])

        for det in helmet_dets if isinstance(helmet_dets, list) else []:
            if isinstance(det, dict):
                det.setdefault("class", "helmet")
                all_detections.append(det)

        for det in bike_dets if isinstance(bike_dets, list) else []:
            if isinstance(det, dict):
                det.setdefault("class", det.get("class_raw", "motorcycle"))
                all_detections.append(det)

        for det in pothole_dets if isinstance(pothole_dets, list) else []:
            if isinstance(det, dict):
                det.setdefault("class", "pothole")
                all_detections.append(det)

        for plate in plates:
            if not isinstance(plate, dict):
                continue
            all_detections.append(
                {
                    "class": "license_plate",
                    "confidence": plate.get("confidence", 0),
                    "bbox": plate.get("bbox", []),
                    "text": plate.get("plate_number", ""),
                }
            )

        return all_detections

    @staticmethod
    def _extract_plate_numbers(
        plates: list[Any],
        fallback_plate_numbers: Any,
    ) -> list[str]:
        extracted: list[str] = []

        for plate in plates:
            if isinstance(plate, dict):
                plate_text = plate.get("plate_number") or plate.get("text")
                normalized = ViolationDetector._normalize_plate_number(plate_text)
                if normalized:
                    extracted.append(normalized)
            elif isinstance(plate, str):
                normalized = ViolationDetector._normalize_plate_number(plate)
                if normalized:
                    extracted.append(normalized)

        extracted.extend(ViolationDetector._normalize_plate_list(fallback_plate_numbers))
        return ViolationDetector._dedupe_preserving_order(extracted)

    @staticmethod
    def _normalize_plate_list(value: Any) -> list[str]:
        if isinstance(value, str):
            value = [value]
        if not isinstance(value, list):
            return []

        normalized_plates: list[str] = []
        for plate in value:
            normalized = ViolationDetector._normalize_plate_number(plate)
            if normalized:
                normalized_plates.append(normalized)
        return ViolationDetector._dedupe_preserving_order(normalized_plates)

    @staticmethod
    def _normalize_plate_number(value: Any) -> str | None:
        if not isinstance(value, str):
            return None

        plate = re.sub(r"\s+", " ", value.strip().upper())
        if not plate or plate == "UNKNOWN":
            return None
        return plate

    @staticmethod
    def _extract_valid_plates(
        plates: list[Any],
        plate_numbers: list[str],
    ) -> list[str]:
        valid_plates: list[str] = []

        for plate in plates:
            if not isinstance(plate, dict) or plate.get("valid_format") is not True:
                continue
            normalized = ViolationDetector._normalize_plate_number(
                plate.get("plate_number") or plate.get("text")
            )
            if normalized:
                valid_plates.append(normalized)

        if not valid_plates:
            valid_plates = [
                plate for plate in plate_numbers if ViolationDetector._is_valid_plate_number(plate)
            ]

        return ViolationDetector._dedupe_preserving_order(valid_plates)

    @staticmethod
    def _is_valid_plate_number(plate: str) -> bool:
        return bool(ViolationDetector.INDIAN_PLATE_PATTERN.match(plate))

    @staticmethod
    def _build_violation_type(
        helmet_violations: int,
        triple_riding: bool,
        max_riders: int,
        pothole_count: int,
        no_parking: bool,
    ) -> str:
        violations: list[str] = []

        if triple_riding:
            label = (
                f"Triple Riding ({max_riders} riders)"
                if max_riders > 0
                else "Triple Riding"
            )
            violations.append(label)

        if helmet_violations == 1:
            violations.append("Helmet Violation")
        elif helmet_violations > 1:
            violations.append(f"{helmet_violations} Helmet Violations")

        if no_parking:
            violations.append("No Parking")

        if pothole_count > 0:
            violations.append(
                "Pothole" if pothole_count == 1 else f"{pothole_count} Potholes"
            )

        return ", ".join(violations) if violations else "No Violation"

    @staticmethod
    def _detect_media_type(image_bytes: bytes) -> str:
        if image_bytes.startswith(b"\xff\xd8\xff"):
            return "image/jpeg"
        if image_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
            return "image/png"
        if image_bytes.startswith((b"GIF87a", b"GIF89a")):
            return "image/gif"
        if image_bytes[:4] == b"RIFF" and image_bytes[8:12] == b"WEBP":
            return "image/webp"
        return "image/jpeg"

    @staticmethod
    def _safe_int(*values: Any) -> int:
        for value in values:
            if value in (None, ""):
                continue
            try:
                return int(value)
            except (TypeError, ValueError):
                try:
                    return int(float(value))
                except (TypeError, ValueError):
                    continue
        return 0

    @staticmethod
    def _as_bool(*values: Any) -> bool:
        for value in values:
            if isinstance(value, bool):
                return value
            if isinstance(value, (int, float)):
                return bool(value)
            if isinstance(value, str):
                normalized = value.strip().lower()
                if normalized in ViolationDetector.TRUE_VALUES:
                    return True
                if normalized in {"0", "false", "no", "n"}:
                    return False
        return False

    @staticmethod
    def _extract_text_response(response_data: dict[str, Any]) -> str:
        text_chunks: list[str] = []
        for block in response_data.get("content", []):
            if isinstance(block, dict) and block.get("type") == "text":
                text = block.get("text")
                if isinstance(text, str):
                    text_chunks.append(text)
        return "\n".join(text_chunks).strip()

    @staticmethod
    def _extract_json_object(text: str) -> dict[str, Any]:
        stripped = text.strip()
        try:
            parsed = json.loads(stripped)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            pass

        match = re.search(r"\{.*\}", stripped, re.DOTALL)
        if not match:
            raise json.JSONDecodeError("No JSON object found", stripped, 0)

        parsed = json.loads(match.group(0))
        if not isinstance(parsed, dict):
            raise json.JSONDecodeError("Response JSON was not an object", stripped, 0)
        return parsed

    @staticmethod
    def _dedupe_preserving_order(items: list[str]) -> list[str]:
        seen: set[str] = set()
        deduped: list[str] = []
        for item in items:
            if item in seen:
                continue
            seen.add(item)
            deduped.append(item)
        return deduped

    @staticmethod
    def _failure_response(
        error: Exception | None,
        image_bytes: bytes,
        claude_error: Exception | None = None,
    ) -> tuple[str, dict, bytes]:
        if claude_error is not None:
            error_messages: list[str] = []
            if error:
                error_messages.append(f"Primary detector: {error}")
            error_messages.append(f"Claude detector: {claude_error}")
            return (
                "AI Service Unavailable",
                {
                    "error": "; ".join(error_messages),
                    "detector_source": "parallel_failed",
                },
                image_bytes,
            )

        if isinstance(error, requests.exceptions.Timeout):
            return (
                "AI Service Unavailable",
                {"error": "Timeout", "detector_source": "primary_model_api"},
                image_bytes,
            )

        if isinstance(error, PrimaryDetectorError):
            return (
                "Detection Failed",
                {
                    "error": str(error),
                    "detector_source": "primary_model_api",
                },
                image_bytes,
            )

        return (
            "AI Service Unavailable",
            {
                "error": "Unexpected detector error",
                "detector_source": "primary_model_api",
            },
            image_bytes,
        )


detector = ViolationDetector()
