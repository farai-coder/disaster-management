"""
Simulated AI Image Classification Service.
In production, this would use a trained ML model (e.g., CNN) to classify
incident images. For the prototype, we use keyword-based heuristics on
filename and basic image analysis.
"""

import random
from models import IncidentCategory

# Keyword mappings for simulated classification
KEYWORD_MAP = {
    "fire": IncidentCategory.FIRE,
    "flame": IncidentCategory.FIRE,
    "smoke": IncidentCategory.FIRE,
    "burn": IncidentCategory.FIRE,
    "crash": IncidentCategory.ACCIDENT,
    "accident": IncidentCategory.ACCIDENT,
    "collision": IncidentCategory.ACCIDENT,
    "wreck": IncidentCategory.ACCIDENT,
    "crime": IncidentCategory.CRIME,
    "theft": IncidentCategory.CRIME,
    "robbery": IncidentCategory.CRIME,
    "assault": IncidentCategory.CRIME,
    "flood": IncidentCategory.CYCLONE_FLOOD,
    "cyclone": IncidentCategory.CYCLONE_FLOOD,
    "storm": IncidentCategory.CYCLONE_FLOOD,
    "water": IncidentCategory.CYCLONE_FLOOD,
    "disease": IncidentCategory.DISEASE_OUTBREAK,
    "outbreak": IncidentCategory.DISEASE_OUTBREAK,
    "virus": IncidentCategory.DISEASE_OUTBREAK,
    "drought": IncidentCategory.DROUGHT,
    "dry": IncidentCategory.DROUGHT,
}

# Confidence thresholds for simulation
CONFIDENCE_RANGE = (0.65, 0.95)


def classify_image(filename: str, description: str = "") -> dict:
    """
    Simulate AI image classification based on filename and description.
    Returns suggested category and confidence score.
    """
    text = f"{filename} {description}".lower()

    for keyword, category in KEYWORD_MAP.items():
        if keyword in text:
            confidence = round(random.uniform(*CONFIDENCE_RANGE), 2)
            return {
                "suggested_category": category,
                "confidence": confidence,
                "method": "keyword_match",
            }

    # Random fallback for demo purposes
    categories = list(IncidentCategory)
    return {
        "suggested_category": random.choice(categories),
        "confidence": round(random.uniform(0.3, 0.55), 2),
        "method": "fallback_random",
    }
