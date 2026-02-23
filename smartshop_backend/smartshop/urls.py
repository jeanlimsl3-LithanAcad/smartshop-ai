# smartshop/urls.py

from django.urls import path

from .views import (
    ProductListView,
    ProductDetailView,
    ProductReviewSummaryView,
    RecommendationView,
    SmartSearchView,
    ChatAssistantView,   # 🔹 NEW
)

urlpatterns = [
    path("products/", ProductListView.as_view(), name="product-list"),
    path("products/<int:pk>/", ProductDetailView.as_view(), name="product-detail"),
    path(
        "products/<int:pk>/review-summary/",
        ProductReviewSummaryView.as_view(),
        name="product-review-summary",
    ),
    path(
        "recommendations/",
        RecommendationView.as_view(),
        name="product-recommendations",
    ),
    path(
        "search/",
        SmartSearchView.as_view(),
        name="product-search",
    ),
    path(
        "assistant/chat/",
        ChatAssistantView.as_view(),
        name="chat-assistant",
    ),
]