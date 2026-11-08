from django.contrib import admin

from .models import Task


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ("title", "status", "priority", "due_date", "responsible_id", "project_id")
    list_filter = ("status", "priority")
    search_fields = ("title",)
