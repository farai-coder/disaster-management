"""Static directory of authority offices across Zimbabwe with toll-free contacts."""

import math
from models import AuthorityType


# Major authority offices and stations (lat, lon)
AUTHORITY_OFFICES = [
    # Police
    {"name": "ZRP Harare Central", "type": AuthorityType.POLICE, "city": "Harare", "lat": -17.831773, "lon": 31.045686, "phone": "995"},
    {"name": "ZRP Bulawayo Central", "type": AuthorityType.POLICE, "city": "Bulawayo", "lat": -20.150000, "lon": 28.583333, "phone": "995"},
    {"name": "ZRP Mutare Central", "type": AuthorityType.POLICE, "city": "Mutare", "lat": -18.972000, "lon": 32.673000, "phone": "995"},
    {"name": "ZRP Gweru Central", "type": AuthorityType.POLICE, "city": "Gweru", "lat": -19.450000, "lon": 29.816667, "phone": "995"},
    {"name": "ZRP Masvingo Central", "type": AuthorityType.POLICE, "city": "Masvingo", "lat": -20.063333, "lon": 30.826667, "phone": "995"},
    {"name": "ZRP Chinhoyi", "type": AuthorityType.POLICE, "city": "Chinhoyi", "lat": -17.366667, "lon": 30.200000, "phone": "995"},

    # Fire Brigade
    {"name": "Harare Fire Brigade", "type": AuthorityType.FIRE_DEPARTMENT, "city": "Harare", "lat": -17.825700, "lon": 31.044400, "phone": "993"},
    {"name": "Bulawayo Fire Brigade", "type": AuthorityType.FIRE_DEPARTMENT, "city": "Bulawayo", "lat": -20.149800, "lon": 28.585300, "phone": "993"},
    {"name": "Mutare Fire Brigade", "type": AuthorityType.FIRE_DEPARTMENT, "city": "Mutare", "lat": -18.971200, "lon": 32.671100, "phone": "993"},
    {"name": "Gweru Fire Brigade", "type": AuthorityType.FIRE_DEPARTMENT, "city": "Gweru", "lat": -19.451100, "lon": 29.815300, "phone": "993"},

    # Health / Ambulance
    {"name": "Parirenyatwa Group of Hospitals", "type": AuthorityType.HEALTH, "city": "Harare", "lat": -17.812900, "lon": 31.040600, "phone": "994"},
    {"name": "Sally Mugabe Central Hospital", "type": AuthorityType.HEALTH, "city": "Harare", "lat": -17.860500, "lon": 31.001100, "phone": "994"},
    {"name": "Mpilo Central Hospital", "type": AuthorityType.HEALTH, "city": "Bulawayo", "lat": -20.157700, "lon": 28.581100, "phone": "994"},
    {"name": "Mutare Provincial Hospital", "type": AuthorityType.HEALTH, "city": "Mutare", "lat": -18.974500, "lon": 32.665400, "phone": "994"},
    {"name": "Gweru Provincial Hospital", "type": AuthorityType.HEALTH, "city": "Gweru", "lat": -19.452800, "lon": 29.821500, "phone": "994"},
    {"name": "Masvingo Provincial Hospital", "type": AuthorityType.HEALTH, "city": "Masvingo", "lat": -20.062500, "lon": 30.829100, "phone": "994"},

    # Civil Protection
    {"name": "DCP Harare HQ", "type": AuthorityType.CIVIL_PROTECTION, "city": "Harare", "lat": -17.830000, "lon": 31.050000, "phone": "0242-700-117"},
    {"name": "DCP Bulawayo Office", "type": AuthorityType.CIVIL_PROTECTION, "city": "Bulawayo", "lat": -20.151000, "lon": 28.582000, "phone": "0292-65351"},
    {"name": "DCP Manicaland Office", "type": AuthorityType.CIVIL_PROTECTION, "city": "Mutare", "lat": -18.970000, "lon": 32.670000, "phone": "020-64461"},
]


# Toll-free / emergency numbers for the public portal
EMERGENCY_NUMBERS = [
    {"label": "Police", "number": "995", "alt": "+263 242 700 171"},
    {"label": "Ambulance / Health", "number": "994", "alt": "+263 242 705 906"},
    {"label": "Fire Brigade", "number": "993", "alt": "+263 242 752 167"},
    {"label": "Civil Protection", "number": "0242-700-117", "alt": ""},
    {"label": "Childline Zimbabwe", "number": "116", "alt": ""},
    {"label": "Musasa (GBV)", "number": "08080074", "alt": ""},
    {"label": "ZESA Emergency", "number": "08006328", "alt": ""},
    {"label": "ZINWA Emergency", "number": "08004545", "alt": ""},
]


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in kilometres."""
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlon / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def nearest_offices(lat: float, lon: float, authority_types: list[AuthorityType] | None = None, limit: int = 5):
    pool = AUTHORITY_OFFICES
    if authority_types:
        type_set = {t.value if hasattr(t, "value") else t for t in authority_types}
        pool = [o for o in pool if o["type"].value in type_set]

    enriched = []
    for office in pool:
        dist = haversine_km(lat, lon, office["lat"], office["lon"])
        enriched.append({
            "name": office["name"],
            "type": office["type"].value,
            "city": office["city"],
            "latitude": office["lat"],
            "longitude": office["lon"],
            "phone": office["phone"],
            "distance_km": round(dist, 1),
        })
    enriched.sort(key=lambda x: x["distance_km"])
    return enriched[:limit]
