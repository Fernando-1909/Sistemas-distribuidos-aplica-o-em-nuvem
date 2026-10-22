from rest_framework import serializers

from .models import Task


class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = [
            "id",
            "title",
            "description",
            "status",
            "responsible",
            "priority",
            "due_date",
            "created_at",
            "updated_at",
            "completed_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "completed_at"]

    def validate_title(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Informe um título para a tarefa.")
        return value
