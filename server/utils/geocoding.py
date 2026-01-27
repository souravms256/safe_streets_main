import requests
import time

def get_address(lat: float, lon: float) -> str:
    """
    Reverse geocodes latitude and longitude using Nominatim (OpenStreetMap).
    """
    url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lon}&zoom=18&addressdetails=1"
    headers = {
        "User-Agent": "SafeStreetsAI/1.0 (contact: your-email@example.com)"
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            return data.get("display_name", f"{lat}, {lon}")
        return f"{lat}, {lon}"
    except Exception as e:
        print(f"Geocoding error: {e}")
        return f"{lat}, {lon}"
