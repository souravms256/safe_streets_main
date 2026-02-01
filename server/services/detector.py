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
            tuple: (violation_type: str, details: dict)
        """
        try:
            # Prepare file for upload
            files = {'file': ('image.jpg', image_bytes, 'image/jpeg')}
            
            # Call the external API
            response = requests.post(settings.MODEL_API_URL, files=files, timeout=30)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    
                    # Logic to determine violation type from the specific API response
                    # New Response format: {'violations': {'helmet_violations': 0, 'triple_riding': False}, ...}
                    
                    violations_data = data.get("violations", {})
                    violations = []
                    
                    # Check for Triple Riding
                    if violations_data.get("triple_riding") is True:
                         violations.append("Triple Riding")
                    
                    # Check for Helmet Violations
                    if violations_data.get("helmet_violations", 0) > 0:
                        violations.append("Helmet Violation")

                    if not violations:
                        violation_type = "No Violation"
                    else:
                        violation_type = ", ".join(violations)
                        
                    # Config parsing for Frontend
                    # Frontend expects: helmet_violations, triple_riding, rider_count at top level of details
                    data["helmet_violations"] = violations_data.get("helmet_violations", 0)
                    data["triple_riding"] = violations_data.get("triple_riding", False)
                    data["rider_count"] = data.get("details", {}).get("max_riders_on_bike", 0) # Map from app.py response
                    
                    # Also flatten detections for easier access if needed, though frontend iterates data.detections (which exists in app.py resp)
                    # app.py structure: "detections": {"helmets": [...]}
                    # frontend expects: "detections": [...]
                    # Let's map detections.helmets -> detections
                    if "detections" in data and isinstance(data["detections"], dict):
                         data["detections"] = data["detections"].get("helmets", [])
                        
                    # Return both the label and the full data object
                    return violation_type, data
                    
                except Exception as e:
                   print(f"Error parsing model response: {e}")
                   # Fallback
                   return "Detection Failed", {"error": "Parse Error", "raw": response.text}
            else:
                print(f"Model API error: {response.status_code} - {response.text}")
                return "Detection Failed", {"error": f"API Error {response.status_code}", "raw": response.text}

        except Exception as e:
            print(f"Error calling AI model: {e}")
            return "AI Service Unavailable", {}

detector = ViolationDetector()