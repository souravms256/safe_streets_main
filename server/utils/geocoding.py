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
            address = data.get("display_name")
            if address:
                return address
            else:
                print(f"Geocoding returned 200 but no display_name: {data}")
                return f"{lat}, {lon}"
        else:
            print(f"Geocoding failed with status {response.status_code}: {response.text}")
            return f"{lat}, {lon}"
    except Exception as e:
        print(f"Geocoding exception: {e}")
        return f"{lat}, {lon}"
