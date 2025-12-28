from django.conf import settings
from django.http import HttpResponse


class SimpleCORSMiddleware:
    """Minimal CORS support for approved origins."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        origin = request.headers.get("Origin")
        allowed = origin in getattr(settings, "CORS_ALLOWED_ORIGINS", [])

        if request.method == "OPTIONS":
            response = HttpResponse(status=200)
            if allowed:
                response["Access-Control-Allow-Origin"] = origin
                response["Access-Control-Allow-Credentials"] = "true"
                response["Vary"] = "Origin"
            response["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            requested_headers = request.headers.get(
                "Access-Control-Request-Headers", "Authorization, Content-Type"
            )
            response["Access-Control-Allow-Headers"] = requested_headers
            response["Access-Control-Max-Age"] = "86400"
            return response

        response = self.get_response(request)
        if allowed:
            response["Access-Control-Allow-Origin"] = origin
            response["Access-Control-Allow-Credentials"] = "true"
            response["Vary"] = "Origin"
        return response
