from django.db import models


class Member(models.Model):
    """Responsável por tarefas (pessoa da equipe)."""

    name = models.CharField("nome", max_length=100)
    email = models.EmailField("e-mail", blank=True)
    created_at = models.DateTimeField("criado em", auto_now_add=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "responsável"
        verbose_name_plural = "responsáveis"

    def __str__(self):
        return self.name
