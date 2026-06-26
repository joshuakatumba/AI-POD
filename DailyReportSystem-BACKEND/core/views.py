from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from django.http import JsonResponse

@api_view(['GET'])
@permission_classes([AllowAny])
def healthz(request):
    return JsonResponse({"status": "ok"})


