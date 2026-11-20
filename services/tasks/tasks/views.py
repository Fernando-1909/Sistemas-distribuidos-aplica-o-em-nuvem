from django.db import connection, transaction
from rest_framework import viewsets
from rest_framework.decorators import api_view
from rest_framework.response import Response

from . import clients, events
from .models import Task
from .serializers import TaskSerializer


class TaskViewSet(viewsets.ModelViewSet):
    """CRUD de tarefas. Filtros: ?status=, ?responsible_id=, ?project_id="""

    serializer_class = TaskSerializer

    def get_queryset(self):
        queryset = Task.objects.all()
        params = self.request.query_params
        if params.get("status"):
            queryset = queryset.filter(status=params["status"])
        if params.get("responsible_id", "").isdigit():
            queryset = queryset.filter(responsible_id=int(params["responsible_id"]))
        if params.get("project_id", "").isdigit():
            queryset = queryset.filter(project_id=int(params["project_id"]))
        return queryset

    # ---- Módulo 4: publica o evento "tarefa concluída" quando o status VIRA "done" ----
    def perform_create(self, serializer):
        task = serializer.save()
        if task.status == Task.Status.DONE:
            transaction.on_commit(lambda: events.publish_task_completed(task))

    def perform_update(self, serializer):
        was_done = serializer.instance.status == Task.Status.DONE
        task = serializer.save()
        if task.status == Task.Status.DONE and not was_done:
            # on_commit: só publica depois que a alteração foi gravada no banco
            transaction.on_commit(lambda: events.publish_task_completed(task))

    def list(self, request, *args, **kwargs):
        tasks = list(self.filter_queryset(self.get_queryset()))
        # Uma única consulta em lote a cada serviço (e não uma por tarefa)
        lookups = clients.resolve(
            {t.responsible_id for t in tasks if t.responsible_id},
            {t.project_id for t in tasks if t.project_id},
        )
        context = {**self.get_serializer_context(), "lookups": lookups}
        return Response(TaskSerializer(tasks, many=True, context=context).data)


@api_view(["GET"])
def health(request):
    """Health check. Com ?deep=1 também mostra o estado dos serviços dependentes."""
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1")
    data = {"status": "ok", "service": "tasks", "database": connection.vendor}
    if request.query_params.get("deep"):
        data["dependencies"] = {
            "users": clients.ping("users"),
            "projects": clients.ping("projects"),
            "rabbitmq": events.ping(),
        }
    return Response(data)
