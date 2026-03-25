import requests
from core.config import settings
from utils.logging import get_logger

logger = get_logger("detector")

class ViolationDetector:
    """
    Client for the external AI Violation Detection Model (hosted on Azure).
    """

    @staticmethod
    def detect(image_bytes: bytes) -> tuple[str, dict, bytes]:
        """
        Sends the image to the external AI model and returns the detected violation type.
        
        Args:
            image_bytes (bytes): The raw bytes of the image file.
            
        Returns:
            tuple: (violation_type: str, details: dict, annotated_image_bytes: bytes)
        """
        try:
            # Prepare file for upload
            files = {'file': ('image.jpg', image_bytes, 'image/jpeg')}
            
            # Call the external API
            response = requests.post(settings.MODEL_API_URL, files=files, timeout=30)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    
                    violations_data = data.get("violations", {})
                    violations = []
                    helmet_violation_count = int(violations_data.get("helmet_violations", 0) or 0)
                    triple_riding = violations_data.get("triple_riding") is True
                    max_riders = int(violations_data.get("max_riders_on_bike", 0) or 0)
                    
                    # Check for Triple Riding
                    if triple_riding:
                        if max_riders > 0:
                            violations.append(f"Triple Riding ({max_riders} riders)")
                        else:
                            violations.append("Triple Riding")
                    
                    # Check for Helmet Violations
                    if helmet_violation_count > 0:
                        if helmet_violation_count == 1:
                            violations.append("Helmet Violation")
                        else:
                            violations.append(f"{helmet_violation_count} Helmet Violations")

                    # Check for Potholes
                    pothole_count = data.get("road_condition", {}).get("pothole_count", 0)
                    if pothole_count > 0:
                        violations.append("Pothole")

                    if not violations:
                        violation_type = "No Violation"
                    else:
                        violation_type = ", ".join(violations)
                        
                    # Config parsing for Frontend
                    data["helmet_violations"] = helmet_violation_count
                    data["triple_riding"] = triple_riding
                    data["max_riders_on_bike"] = max_riders
                    data["potholes_detected"] = pothole_count
                    data["rider_count"] = data.get("detections", {}).get("riders_on_bikes", 0)
                    
                    # Combine all bounding box detections for the frontend
                    detections_dict = data.get("detections", {})
                    all_detections = []
                    
                    # Add helmets
                    all_detections.extend(detections_dict.get("helmet_detections", []))
                    
                    # Add motorcycles
                    for m in detections_dict.get("motorcycles", []):
                        m["class"] = m.get("class", m.get("class_raw", "motorcycle"))
                        all_detections.append(m)

                    potholes_raw = data.get("road_condition", {}).get("potholes", [])
                    for p in potholes_raw:
                        p["class"] = "pothole"
                        all_detections.append(p)
                        
                    data["detections"] = all_detections

                    # Fetch the Annotated Image from VM
                    annotated_image_bytes = image_bytes # Default to original if fetch fails
                    output_url = data.get("output", {}).get("url")
                    if output_url:
                        # Construct full URL (assumes output_url is like /output/detect_...)
                        base_url = settings.MODEL_API_URL.rsplit('/', 1)[0]
                        full_annotated_url = f"{base_url}{output_url}"
                        logger.info("Fetching annotated image from VM output URL: %s", full_annotated_url)
                        img_res = requests.get(full_annotated_url, timeout=10)
                        if img_res.status_code == 200:
                            annotated_image_bytes = img_res.content
                            logger.info("Fetched annotated image bytes successfully")
                        
                    # Return both the label, the full data object, and the annotated image
                    return violation_type, data, annotated_image_bytes
                    
                except Exception as e:
                   logger.error("Error parsing model response: %s", e)
                   # Fallback
                   return "Detection Failed", {"error": "Parse Error", "raw": response.text}, image_bytes
            else:
                logger.error("Model API error: %s - %s", response.status_code, response.text)
                return "Detection Failed", {"error": f"API Error {response.status_code}", "raw": response.text}, image_bytes

        except Exception as e:
            logger.error("Error calling AI model: %s", e)
            return "AI Service Unavailable", {}, image_bytes

detector = ViolationDetector()
