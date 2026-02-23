# smartshop/views.py

import os

from django.db.models import Q
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Product
from .serializers import ProductSerializer
from .ai_service import (
    generate_review_summary,
    generate_recommendation_message,
    generate_search_explanation,
    generate_chat_response,  # ✅ correct name
)


class ProductListView(generics.ListAPIView):
    queryset = (
        Product.objects.all()
        .select_related("category")
        .prefetch_related("reviews")
    )
    serializer_class = ProductSerializer


class ProductDetailView(generics.RetrieveAPIView):
    queryset = (
        Product.objects.all()
        .select_related("category")
        .prefetch_related("reviews")
    )
    serializer_class = ProductSerializer


class ProductReviewSummaryView(APIView):
    """
    GET /api/products/<pk>/review-summary/

    Returns AI-generated, structured insights of all reviews
    for this product: summary, pros, cons, and sentiment.
    """

    def get(self, request, pk):
        # 1) Get product or return 404
        try:
            product = Product.objects.get(pk=pk)
        except Product.DoesNotExist:
            return Response(
                {"detail": "Product not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # 2) Collect review comments (assuming related_name="reviews")
        reviews_qs = product.reviews.all().order_by("-created_at")
        review_texts = [r.comment for r in reviews_qs if r.comment]

        if not review_texts:
            return Response(
                {
                    "product_id": product.id,
                    "product_name": product.name,
                    "review_count": 0,
                    "summary": None,
                    "pros": [],
                    "cons": [],
                    "sentiment": None,
                    "message": "No reviews available for summarisation.",
                },
                status=status.HTTP_200_OK,
            )

        # 3) Safety: ensure API key exists
        if not os.getenv("OPENAI_API_KEY"):
            return Response(
                {
                    "product_id": product.id,
                    "product_name": product.name,
                    "review_count": len(review_texts),
                    "summary": None,
                    "pros": [],
                    "cons": [],
                    "sentiment": None,
                    "error": "OPENAI_API_KEY is not configured on the server.",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # 4) Call OpenAI via helper – now returns a dict
        try:
            insights = generate_review_summary("\n\n".join(review_texts))
        except Exception as e:
            return Response(
                {
                    "product_id": product.id,
                    "product_name": product.name,
                    "review_count": len(review_texts),
                    "summary": None,
                    "pros": [],
                    "cons": [],
                    "sentiment": None,
                    "error": f"AI service error: {str(e)}",
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        # 5) Successful response – ensure we always send all fields
        return Response(
            {
                "product_id": product.id,
                "product_name": product.name,
                "review_count": len(review_texts),
                "summary": insights.get("summary"),
                "pros": insights.get("pros", []),
                "cons": insights.get("cons", []),
                "sentiment": insights.get("sentiment"),
            },
            status=status.HTTP_200_OK,
        )


class RecommendationView(APIView):
    """
    GET /api/recommendations/?product_id=<id>
    Returns a list of recommended products plus an AI explanation.
    """

    def get(self, request):
        product_id = request.query_params.get("product_id")

        if not product_id:
            return Response(
                {"detail": "product_id query parameter is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            base_product = Product.objects.select_related("category").get(
                pk=product_id
            )
        except Product.DoesNotExist:
            return Response(
                {"detail": "Base product not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        recommended_qs = (
            Product.objects.filter(category=base_product.category)
            .exclude(pk=base_product.pk)
            .select_related("category")
            .prefetch_related("reviews")[:4]
        )

        serialized = ProductSerializer(recommended_qs, many=True).data

        ai_message = None
        if os.getenv("OPENAI_API_KEY"):
            try:
                ai_message = generate_recommendation_message(
                    base_product, recommended_qs
                )
            except Exception as e:
                ai_message = f"AI explanation unavailable: {str(e)}"
        else:
            ai_message = "AI explanation is disabled because OPENAI_API_KEY is not configured."

        return Response(
            {
                "base_product": ProductSerializer(base_product).data,
                "recommendations": serialized,
                "ai_message": ai_message,
            },
            status=status.HTTP_200_OK,
        )


class SmartSearchView(APIView):
    """
    GET /api/search/?q=<query>
    Returns products matching the query + an AI explanation
    of why these results are relevant.
    """

    def get(self, request):
        query = request.query_params.get("q", "").strip()

        if not query:
            return Response(
                {"detail": "q query parameter is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        products_qs = (
            Product.objects.filter(
                Q(name__icontains=query) | Q(description__icontains=query)
            )
            .select_related("category")
            .prefetch_related("reviews")
        )

        serialized = ProductSerializer(products_qs, many=True).data

        explanation = None

        if not products_qs.exists():
            explanation = "No products matched this search query."
        elif os.getenv("OPENAI_API_KEY"):
            try:
                explanation = generate_search_explanation(query, products_qs)
            except Exception as e:
                explanation = f"AI explanation unavailable: {str(e)}"
        else:
            explanation = (
                "AI explanation is disabled because OPENAI_API_KEY is not configured."
            )

        return Response(
            {
                "query": query,
                "count": len(serialized),
                "results": serialized,
                "explanation": explanation,
            },
            status=status.HTTP_200_OK,
        )


class ChatAssistantView(APIView):
    """
    POST /api/assistant/chat/

    Body:
    {
        "message": "text the user typed",
        "history": [
            {"role": "user", "content": "..."},
            {"role": "assistant", "content": "..."},
            ...
        ]
    }

    Returns:
    {
        "reply": "assistant reply text"
    }
    """

    def post(self, request):
        user_message = (request.data.get("message") or "").strip()
        history = request.data.get("history", [])

        if not user_message:
            return Response(
                {"error": "message field is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get the product catalogue (for now just take all products)
        products_qs = Product.objects.select_related("category").all()

        try:
            reply_text = generate_chat_response(   # ✅ use generate_chat_response
                user_message=user_message,
                conversation_history=history,
                products=products_qs,
            )
        except Exception as e:
            return Response(
                {"error": f"AI error: {str(e)}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response({"reply": reply_text}, status=status.HTTP_200_OK)