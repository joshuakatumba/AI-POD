from rest_framework.decorators import api_view
from django.http import JsonResponse

@api_view(['GET'])
def healthz(request):
    return JsonResponse({"status": "ok"})


