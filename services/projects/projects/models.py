from django.db import models


class Project(models.Model):
    """Projeto (lista) que agrupa tarefas."""

    name = models.CharField("nome", max_length=100)
    color = models.CharField("cor", max_length=7, default="#b79ad9")
    created_at = models.DateTimeField("criado em", auto_now_add=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "projeto"
        verbose_name_plural = "projetos"

    def __str__(self):
        return self.name
