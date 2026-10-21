from django.db import connection
from rest_framework import viewsets
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Task
from .serializers import TaskSerializer


class TaskViewSet(viewsets.ModelViewSet):
    """CRUD de tarefas. Aceita ?status=pending|in_progress|done"""

    serializer_class = TaskSerializer

    def get_queryset(self):
        queryset = Task.objects.all()
        status = self.request.query_params.get("status")
        if status:
            queryset = queryset.filter(status=status)
        return queryset


@api_view(["GET"])
def health(request):
    """Usado pelo Render (health check) e para testar a conexao com o banco."""
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1")
    return Response({"status": "ok", "database": connection.vendor})
