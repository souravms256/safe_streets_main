import random

class ViolationDetector:
    """
    Simulated AI Detector for Traffic Violations.
    In production, this would load a PyTorch/TensorFlow model.
    """
    
    VIOLATION_TYPES = [
        "Helmetless Riding",
        "No Parking",
        "Triple Riding",
        "No Violation"
    ]

    @staticmethod
    def detect(image_bytes: bytes) -> str:
        """
        Analyze the image and return the detected violation type.
        Currently returns a random result for demonstration.
        
        Args:
            image_bytes (bytes): The raw bytes of the image file.
            
        Returns:
            str: The detected violation label.
        """
        # Simulate processing time or logic
        # Here we just pick a random violation to simulate AI detection
        return random.choice(ViolationDetector.VIOLATION_TYPES)

detector = ViolationDetector()
