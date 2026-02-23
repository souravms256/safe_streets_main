from fastapi import APIRouter, Query, HTTPException
from utils.geocoding import get_address_detailed

router = APIRouter(prefix="/geocode", tags=["Geocoding"])


@router.get("/reverse")
def reverse_geocode(
    lat: float = Query(..., description="Latitude", ge=-90, le=90),
    lon: float = Query(..., description="Longitude", ge=-180, le=180),
):
    """
    Reverse geocode coordinates to a human-readable address.
    Uses Nominatim (OpenStreetMap) — free, no API key needed.
    Results are cached server-side to respect rate limits.

    Returns structured address data including:
    - display_name (full address)
    - short_address (concise: Road, Area, City)
    - Individual components (road, city, state, postcode, country)
    """
    try:
        result = get_address_detailed(lat, lon)
        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Geocoding failed: {str(e)}")
