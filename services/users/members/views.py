from django.db import connection
from rest_framework import viewsets
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Member
from .serializers import MemberSerializer


def parse_ids(raw: str) -> list[int]:
    """'1,2,x,3' -> [1, 2, 3] (ignora valores inválidos)."""
    return [int(p) for p in raw.split(",") if p.strip().isdigit()]


class MemberViewSet(viewsets.ModelViewSet):
    """CRUD de responsáveis. Aceita ?ids=1,2,3 (consulta em lote usada pelo serviço de tarefas)."""

    serializer_class = MemberSerializer

    def get_queryset(self):
        queryset = Member.objects.all()
        ids = self.request.query_params.get("ids")
        if ids is not None:
            queryset = queryset.filter(id__in=parse_ids(ids))
        return queryset


@api_view(["GET"])
def health(request):
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1")
    return Response({"status": "ok", "service": "users", "database": connection.vendor})
