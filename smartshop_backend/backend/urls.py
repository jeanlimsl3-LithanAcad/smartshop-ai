# backend/backend/urls.py

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),

    # Main E-commerce APIs
    path("api/", include("smartshop.urls")),

    # AI-specific APIs (chatbot, recommendations, summaries, etc.)
    path("api/ai/", include("ai.urls")),
]

# Serve uploaded media files in development
if settings.DEBUG:
    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT
    )