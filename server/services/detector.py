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
            str: The detected violation label (e.g., "No Parking", "Helmetless Riding").
        """
        try:
            # Prepare file for upload
            files = {'file': ('image.jpg', image_bytes, 'image/jpeg')}
            
            # Call the external API
            response = requests.post(settings.MODEL_API_URL, files=files, timeout=10)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    
                    # Logic to determine violation type from the specific API response
                    # Response format: {'helmet_violations': 0, 'triple_riding': False, ...}
                    
                    violations = []
                    
                    # Check for Triple Riding
                    if data.get("triple_riding") is True:
                         violations.append("Triple Riding")
                    
                    # Check for Helmet Violations
                    if data.get("helmet_violations", 0) > 0:
                        violations.append("Helmet Violation")
                    
                    # Check for No Parking (assuming the API might return this key based on new user prompt)
                    # The user prompt showed "No Parking" in previous JSON example, let's keep it safe.
                    if data.get("violation_type") == "No Parking":
                        violations.append("No Parking")

                    if not violations:
                        violation_type = "No Violation"
                    else:
                        violation_type = ", ".join(violations)
                        
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
