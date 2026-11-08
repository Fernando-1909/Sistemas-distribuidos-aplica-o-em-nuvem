from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import TaskViewSet, health

router = DefaultRouter()
router.register("tasks", TaskViewSet, basename="task")

urlpatterns = [
    path("health/", health),
    path("", include(router.urls)),
]
