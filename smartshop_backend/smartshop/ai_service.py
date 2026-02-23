# smartshop/ai_service.py

import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))


def generate_review_summary(review_text: str) -> dict:
    """
    Generate structured review insights:
    - summary
    - pros
    - cons
    - overall sentiment
    """

    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are an AI assistant that analyses e-commerce product reviews. "
                    "Return ONLY valid JSON with the following structure:\n"
                    "{\n"
                    '  "summary": "short paragraph summary",\n'
                    '  "pros": ["bullet 1", "bullet 2"],\n'
                    '  "cons": ["bullet 1", "bullet 2"],\n'
                    '  "sentiment": "Positive | Neutral | Negative"\n'
                    "}\n"
                ),
            },
            {
                "role": "user",
                "content": review_text,
            },
        ],
        max_tokens=300,
        temperature=0.4,
    )

    import json
    content = response.choices[0].message.content.strip()

    try:
        return json.loads(content)
    except Exception:
        # fallback if AI formatting slightly off
        return {
            "summary": content,
            "pros": [],
            "cons": [],
            "sentiment": "Neutral",
        }


def generate_recommendation_message(base_product, recommended_products) -> str:
    """
    Explain why certain products were recommended.
    """
    product_lines = []
    for p in recommended_products:
        product_lines.append(f"- {p.name} (${p.price}) in category {p.category.name}")

    prompt = f"""
The shopper is looking at this product:

- {base_product.name} (${base_product.price}) in category {base_product.category.name}

You (the AI assistant) selected these products as recommendations:

{chr(10).join(product_lines)}

Write a short, friendly explanation (3–4 sentences max) that tells the
shopper why these items are good recommendations based on the base product.
Avoid marketing buzzwords and be concise.
"""

    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {
                "role": "system",
                "content": "You are a helpful shopping assistant explaining product recommendations.",
            },
            {"role": "user", "content": prompt},
        ],
        max_tokens=180,
        temperature=0.6,
    )

    return response.choices[0].message.content


def generate_search_explanation(query: str, products) -> str:
    """
    Explain why certain products appear in smart search results.
    """
    if not products:
        return "There are no products that closely match this search yet."

    product_lines = []
    for p in products:
        category_name = getattr(p.category, "name", "Unknown")
        product_lines.append(
            f"- {p.name} (${p.price}) in category {category_name}"
        )

    prompt = f"""
The user searched for:

    "{query}"

You are shown the following products from an e-commerce catalogue:

{chr(10).join(product_lines)}

In 3–4 short sentences, explain in plain language why these items are
good matches for the search query. Focus on category, use case, price range,
and relevant features. Be concise and shopper-friendly.
"""

    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {
                "role": "system",
                "content": "You are a helpful shopping assistant explaining search results to users.",
            },
            {"role": "user", "content": prompt},
        ],
        max_tokens=200,
        temperature=0.6,
    )

    return response.choices[0].message.content


# 🔹 NEW: Chat assistant that knows the SmartShop catalogue
def generate_chat_response(user_message: str, conversation_history, products) -> str:
    """
    Use the product catalogue + conversation history to generate a helpful reply.

    - `conversation_history` is a list of dicts with {"role": "user"/"assistant", "content": "..."}.
    - `products` is a queryset or list of Product objects.
    """

    # Build a compact "catalogue" description for the model
    product_snippets = []
    for p in list(products)[:8]:  # limit to first 8 to keep prompt short
        category_name = getattr(p.category, "name", "Unknown")
        description = (p.description or "").replace("\n", " ")
        if len(description) > 120:
            description = description[:117] + "..."
        product_snippets.append(
            f"{p.name} (${p.price}) – {category_name}. {description}"
        )

    if product_snippets:
        catalogue_text = "\n".join(f"- {s}" for s in product_snippets)
    else:
        catalogue_text = "No products are currently available in the catalogue."

    system_prompt = f"""
You are a friendly shopping assistant for the SmartShop e-commerce website.

You MUST base your product suggestions ONLY on the following catalogue.
When you recommend something, explicitly mention the product name and price.
If a request cannot be answered with these products, say so honestly.

SmartShop catalogue:
{catalogue_text}
""".strip()

    messages = [
        {"role": "system", "content": system_prompt},
    ]

    # Add previous turns (limit to last 8 exchanges to keep prompt small)
    if isinstance(conversation_history, list):
        for item in conversation_history[-8:]:
            role = item.get("role")
            content = item.get("content")
            if role in ("user", "assistant") and isinstance(content, str):
                messages.append({"role": role, "content": content})

    # Finally add the new user message
    messages.append({"role": "user", "content": user_message})

    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=messages,
        max_tokens=250,
        temperature=0.7,
    )

    return response.choices[0].message.content.strip()