from rest_framework import serializers

from . import clients
from .models import Task


class TaskSerializer(serializers.ModelSerializer):
    # Campos de leitura montados com dados de OUTROS serviços
    responsible = serializers.SerializerMethodField()
    project = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            "id",
            "title",
            "description",
            "status",
            "priority",
            "due_date",
            "responsible_id",
            "project_id",
            "responsible",
            "project",
            "created_at",
            "updated_at",
            "completed_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "completed_at"]

    # ---- validação (escrita): confirma, via HTTP, que os ids existem ------------
    def validate_title(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Informe um título para a tarefa.")
        return value

    def validate_responsible_id(self, value):
        if value is not None and not clients.exists("users", value):
            raise serializers.ValidationError("Responsável não encontrado.")
        return value

    def validate_project_id(self, value):
        if value is not None and not clients.exists("projects", value):
            raise serializers.ValidationError("Projeto não encontrado.")
        return value

    # ---- leitura: enriquece com nome do responsável e do projeto ----------------
    def _lookups(self, task):
        """Usa o lote já resolvido pela view (lista) ou resolve só esta tarefa."""
        lookups = self.context.get("lookups")
        if lookups is None:
            lookups = clients.resolve(
                {task.responsible_id} if task.responsible_id else set(),
                {task.project_id} if task.project_id else set(),
            )
        return lookups

    @staticmethod
    def _ref(object_id, found, extra=()):
        """state: ok | removed (id não existe mais) | unavailable (serviço fora do ar)."""
        if object_id is None:
            return None
        if found is None:
            return {"id": object_id, "name": None, "state": "unavailable"}
        item = found.get(object_id)
        if item is None:
            return {"id": object_id, "name": None, "state": "removed"}
        return {"id": object_id, "name": item["name"], "state": "ok", **{k: item[k] for k in extra}}

    def get_responsible(self, task):
        return self._ref(task.responsible_id, self._lookups(task)["members"])

    def get_project(self, task):
        return self._ref(task.project_id, self._lookups(task)["projects"], extra=("color",))
