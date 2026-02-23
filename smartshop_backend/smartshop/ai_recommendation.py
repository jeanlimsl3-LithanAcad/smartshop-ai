import os
import json

from openai import OpenAI
from .models import SmartShopProduct

# Read the OpenAI API key from .env (through python-dotenv / environment)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Create a global client if key is available
client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None


def get_ai_recommendations(user_id, user_orders):
    """
    Uses OpenAI Generative AI to suggest product IDs.
    Falls back gracefully if API fails or quota is exceeded.
    """

    # 1) If no API key, skip AI cleanly
    if client is None:
        print("OpenAI API key not found. Skipping AI recommendations.")
        return []

    # 2) If user has no orders, nothing to learn from
    if not user_orders.exists():
        return []

    # 3) Summarise purchase history
    purchased = [
        {
            "id": o.product.id,
            "name": o.product.name,
            "category": o.product.category,
        }
        for o in user_orders.select_related("product")
    ]

    # 4) Summarise entire catalogue
    catalogue = [
        {
            "id": p.id,
            "name": p.name,
            "category": p.category,
        }
        for p in SmartShopProduct.objects.all()
    ]

    # 5) Prompt for the model
    prompt = f"""
You are a recommendation engine for an e-commerce website.

User ID: {user_id}

User purchase history (list of products already bought):
{json.dumps(purchased)}

Full product catalogue:
{json.dumps(catalogue)}

Task:
Recommend 3 NEW products the user is likely to buy next.
You must return ONLY a JSON array of product IDs (integers) that exist in the catalogue.
Example of correct output:
[1, 4, 6]

Do not include any explanation text, just the JSON list.
"""

    try:
        # 6) Call OpenAI Responses API
        # We use a small, cost-efficient model suitable for general tasks.
        response = client.responses.create(
            model="gpt-5-mini",  # or "gpt-5.2" if you prefer a stronger model :contentReference[oaicite:1]{index=1}
            input=prompt,
        )

        # The simple text output is in this convenience property
        ai_text = response.output_text

        # 7) Parse the JSON list returned by the model
        candidate_ids = json.loads(ai_text)

        if not isinstance(candidate_ids, list):
            raise ValueError("AI did not return a JSON list")

        # 8) Keep only valid product IDs that exist in DB
        existing_ids = set(
            SmartShopProduct.objects.values_list("id", flat=True)
        )
        cleaned_ids = [
            pid
            for pid in candidate_ids
            if isinstance(pid, int) and pid in existing_ids
        ]

        return cleaned_ids

    except Exception as e:
        # Any error (API error, JSON error, quota, etc.) falls back gracefully
        print("OpenAI AI error:", e)
        return []
