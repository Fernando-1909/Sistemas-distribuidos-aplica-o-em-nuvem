from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ProjectViewSet, health

router = DefaultRouter()
router.register("projects", ProjectViewSet, basename="project")

urlpatterns = [
    path("health/", health),
    path("", include(router.urls)),
]
