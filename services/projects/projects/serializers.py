import re

from rest_framework import serializers

from .models import Project

HEX_COLOR = re.compile(r"^#[0-9a-fA-F]{6}$")


class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ["id", "name", "color", "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Informe o nome do projeto.")
        return value

    def validate_color(self, value):
        if not HEX_COLOR.match(value):
            raise serializers.ValidationError("Use uma cor no formato #RRGGBB.")
        return value
