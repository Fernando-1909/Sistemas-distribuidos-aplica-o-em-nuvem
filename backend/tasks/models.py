from django.db import models
from django.utils import timezone


class Task(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "A fazer"
        IN_PROGRESS = "in_progress", "Em andamento"
        DONE = "done", "Concluída"

    title = models.CharField("título", max_length=200)
    description = models.TextField("descrição", blank=True)
    status = models.CharField(
        "status", max_length=20, choices=Status.choices, default=Status.PENDING
    )
    responsible = models.CharField("responsável", max_length=100, blank=True)
    created_at = models.DateTimeField("criada em", auto_now_add=True)
    updated_at = models.DateTimeField("atualizada em", auto_now=True)
    # Preenchido quando a tarefa vira "concluída" (base do evento do Módulo 4)
    completed_at = models.DateTimeField("concluída em", null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "tarefa"
        verbose_name_plural = "tarefas"

    def save(self, *args, **kwargs):
        if self.status == self.Status.DONE and self.completed_at is None:
            self.completed_at = timezone.now()
        elif self.status != self.Status.DONE:
            self.completed_at = None
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title
