import requests
from core.config import settings

class ViolationDetector:
    """
    Client for the external AI Violation Detection Model (hosted on Azure).
    """

    @staticmethod
    def detect(image_bytes: bytes) -> tuple[str, dict]:
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
                    
                    # Check for Triple Riding
                    if violations_data.get("triple_riding") is True:
                         violations.append("Triple Riding")
                    
                    # Check for Helmet Violations
                    if violations_data.get("helmet_violations", 0) > 0:
                        violations.append("Helmet Violation")

                    # Check for Potholes
                    pothole_count = data.get("road_condition", {}).get("pothole_count", 0)
                    if pothole_count > 0:
                        violations.append("Pothole")

                    if not violations:
                        violation_type = "No Violation"
                    else:
                        violation_type = ", ".join(violations)
                        
                    # Config parsing for Frontend
                    data["helmet_violations"] = violations_data.get("helmet_violations", 0)
                    data["triple_riding"] = violations_data.get("triple_riding", False)
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
                        print(f"Fetching annotated image from: {full_annotated_url}")
                        img_res = requests.get(full_annotated_url, timeout=10)
                        if img_res.status_code == 200:
                            annotated_image_bytes = img_res.content
                            print("Successfully fetched annotated image bytes")
                        
                    # Return both the label, the full data object, and the annotated image
                    return violation_type, data, annotated_image_bytes
                    
                except Exception as e:
                   print(f"Error parsing model response: {e}")
                   # Fallback
                   return "Detection Failed", {"error": "Parse Error", "raw": response.text}, image_bytes
            else:
                print(f"Model API error: {response.status_code} - {response.text}")
                return "Detection Failed", {"error": f"API Error {response.status_code}", "raw": response.text}, image_bytes

        except Exception as e:
            print(f"Error calling AI model: {e}")
            return "AI Service Unavailable", {}, image_bytes

detector = ViolationDetector()