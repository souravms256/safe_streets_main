import os
import sys
import time
from dotenv import load_dotenv
from supabase import create_client, Client
import requests

# Load env from parent directory
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env'))

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_ANON_KEY")

if not url or not key:
    print("Error: SUPABASE_URL or SUPABASE_ANON_KEY not found in .env")
    sys.exit(1)

supabase: Client = create_client(url, key)

def get_address(lat, lon):
    try:
        url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lon}&zoom=18&addressdetails=1"
        headers = {"User-Agent": "SafeStreetsAI/FixScript/1.0"}
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            return data.get("display_name")
    except Exception as e:
        print(f"  Geocoding error: {e}")
    return None

def fix_addresses():
    print("Fetching violations...")
    # Fetch all violations
    response = supabase.table("violations").select("*").execute()
    violations = response.data
    
    print(f"Found {len(violations)} violations. Checking addresses...")
    
    updated_count = 0
    
    for v in violations:
        needs_update = False
        location_str = v.get("location", "")
        details = v.get("details") or {}
        current_address = details.get("address")
        
        # Check if address is missing or looks like coordinates
        if not current_address or current_address == location_str:
            needs_update = True
        
        if needs_update:
            try:
                # Parse coordinates from location string "lat, lon"
                parts = location_str.split(",")
                if len(parts) == 2:
                    lat = float(parts[0].strip())
                    lon = float(parts[1].strip())
                    
                    print(f"Backfilling address for ID {v['id']} ({lat}, {lon})...")
                    new_address = get_address(lat, lon)
                    
                    if new_address:
                        print(f"  -> Found: {new_address[:50]}...")
                        
                        # Update details
                        details["address"] = new_address
                        
                        # Update DB
                        supabase.table("violations").update({
                            "details": details
                        }).eq("id", v["id"]).execute()
                        
                        updated_count += 1
                        # Sleep to respect Nominatim rate limit (1 req/sec)
                        time.sleep(1.1)
                    else:
                        print("  -> Could not resolve address.")
                else:
                    print(f"Skipping ID {v['id']}: Invalid location format '{location_str}'")
            except Exception as e:
                print(f"Error processing ID {v['id']}: {e}")
                
    print(f"Done. Updated {updated_count} records.")

if __name__ == "__main__":
    fix_addresses()
