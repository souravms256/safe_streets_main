import requests
import time
import threading

# ─── In-Memory Cache ───────────────────────────────────────────────
# Caches reverse geocoding results to avoid redundant Nominatim calls.
# Key: rounded (lat, lon) tuple, Value: {"address": str, "structured": dict, "timestamp": float}
_geocode_cache: dict = {}
_cache_lock = threading.Lock()
CACHE_TTL_SECONDS = 86400  # 24 hours
CACHE_MAX_SIZE = 500

# Rate limiting: Nominatim requires max 1 request/second
_last_request_time = 0.0
_rate_lock = threading.Lock()


def _round_coords(lat: float, lon: float, precision: int = 5) -> tuple:
    """Round coordinates to reduce cache misses for nearby points."""
    return (round(lat, precision), round(lon, precision))


def _rate_limit():
    """Enforce 1 request/second for Nominatim's usage policy."""
    global _last_request_time
    with _rate_lock:
        now = time.time()
        elapsed = now - _last_request_time
        if elapsed < 1.0:
            time.sleep(1.0 - elapsed)
        _last_request_time = time.time()


def _clean_cache():
    """Remove expired entries if cache exceeds max size."""
    if len(_geocode_cache) <= CACHE_MAX_SIZE:
        return
    now = time.time()
    expired_keys = [
        k for k, v in _geocode_cache.items()
        if now - v["timestamp"] > CACHE_TTL_SECONDS
    ]
    for k in expired_keys:
        _geocode_cache.pop(k, None)


def get_address(lat: float, lon: float) -> str:
    """
    Reverse geocodes latitude and longitude using Nominatim (OpenStreetMap).
    Returns a human-readable display_name string.
    Uses in-memory caching and rate limiting.
    """
    result = get_address_detailed(lat, lon)
    return result["display_name"]


def get_address_detailed(lat: float, lon: float) -> dict:
    """
    Reverse geocodes latitude and longitude using Nominatim (OpenStreetMap).
    Returns structured address data:
    {
        "display_name": "Full human-readable address",
        "road": "...",
        "neighbourhood": "...",
        "suburb": "...",
        "city": "...",
        "state": "...",
        "postcode": "...",
        "country": "...",
        "short_address": "Road, Area, City",
        "latitude": float,
        "longitude": float
    }
    """
    cache_key = _round_coords(lat, lon)

    # Check cache first
    with _cache_lock:
        if cache_key in _geocode_cache:
            cached = _geocode_cache[cache_key]
            if time.time() - cached["timestamp"] < CACHE_TTL_SECONDS:
                return cached["data"]
            else:
                _geocode_cache.pop(cache_key, None)

    # Not in cache — call Nominatim
    url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lon}&zoom=18&addressdetails=1"
    headers = {
        "User-Agent": "SafeStreetsAI-ResearchProject/3.0 (Contact: samarthuday@users.noreply.github.com; Developer: samarthuday)",
        "Referer": "https://safestreets-violation-system.com"
    }

    # Retry once if the first attempt fails
    max_retries = 2
    last_error = None

    for attempt in range(max_retries):
        try:
            _rate_limit()
            response = requests.get(url, headers=headers, timeout=10)

            if response.status_code == 200:
                data = response.json()
                display_name = data.get("display_name", f"{lat}, {lon}")
                addr = data.get("address", {})

                result = {
                    "display_name": display_name,
                    "road": addr.get("road", addr.get("pedestrian", "")),
                    "neighbourhood": addr.get("neighbourhood", addr.get("hamlet", "")),
                    "suburb": addr.get("suburb", addr.get("village", "")),
                    "city": addr.get("city", addr.get("town", addr.get("county", ""))),
                    "state_district": addr.get("state_district", ""),
                    "state": addr.get("state", ""),
                    "postcode": addr.get("postcode", ""),
                    "country": addr.get("country", ""),
                    "short_address": _build_short_address(addr),
                    "latitude": lat,
                    "longitude": lon,
                }

                # Store in cache
                with _cache_lock:
                    _clean_cache()
                    _geocode_cache[cache_key] = {
                        "data": result,
                        "timestamp": time.time()
                    }

                return result
            else:
                last_error = f"Nominatim returned status {response.status_code}: {response.text}"
                print(f"Geocoding attempt {attempt + 1} failed: {last_error}")

        except Exception as e:
            last_error = str(e)
            print(f"Geocoding attempt {attempt + 1} exception: {e}")

        # Wait before retry
        if attempt < max_retries - 1:
            time.sleep(1.5)

    raise RuntimeError(f"Geocoding failed after {max_retries} attempts: {last_error}")


def _build_short_address(addr: dict) -> str:
    """Build a concise short address like 'MG Road, Shivajinagar, Bengaluru'."""
    parts = []

    road = addr.get("road", addr.get("pedestrian", ""))
    if road:
        parts.append(road)

    area = addr.get("neighbourhood", addr.get("suburb", addr.get("hamlet", addr.get("village", ""))))
    if area and area not in parts:
        parts.append(area)

    city = addr.get("city", addr.get("town", addr.get("county", "")))
    if city and city not in parts:
        parts.append(city)

    if not parts:
        state = addr.get("state", "")
        if state:
            parts.append(state)

    return ", ".join(parts) if parts else "Unknown Location"
