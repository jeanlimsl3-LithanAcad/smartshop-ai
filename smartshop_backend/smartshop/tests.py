from django.test import TestCase
from django.urls import reverse
from .models import SmartShopProduct, Category


class ProductApiTests(TestCase):
    def setUp(self):
        # Minimal data to ensure endpoint has something to return
        cat = Category.objects.create(name="TestCat", slug="testcat")
        SmartShopProduct.objects.create(
            category=cat,
            name="Test Product",
            price=9.99,
            description="Test description",
        )

    def test_product_list_returns_200(self):
        url = reverse("product-list")  # name from smartshop/urls.py
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertGreaterEqual(len(data), 1)
