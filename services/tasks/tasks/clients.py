"""Cliente HTTP para consultar os outros microsserviços (users e projects).

Regras de tolerância a falhas:
- toda chamada tem timeout (settings.SERVICE_TIMEOUT);
- se o serviço não responde (ou devolve erro 5xx), levantamos ServiceUnavailable,
  que vira uma resposta 503 com mensagem amigável;
- na LEITURA, o serviço de tarefas não falha: devolve a tarefa com o nome "indisponível".
"""
import logging
from concurrent.futures import ThreadPoolExecutor

import requests
from django.conf import settings
from rest_framework.exceptions import APIException

logger = logging.getLogger(__name__)

LABELS = {"users": "responsáveis", "projects": "projetos"}
RESOURCES = {"users": "members", "projects": "projects"}


class ServiceUnavailable(APIException):
    status_code = 503
    default_code = "service_unavailable"

    def __init__(self, service: str):
        self.service = service
        super().__init__(
            detail=f"O serviço de {LABELS[service]} está indisponível no momento. "
            "Tente novamente em instantes."
        )


def _base_url(service: str) -> str:
    return settings.USERS_SERVICE_URL if service == "users" else settings.PROJECTS_SERVICE_URL


def _get(service: str, path: str, params: dict | None = None) -> requests.Response:
    url = f"{_base_url(service)}/api/{path}"
    try:
        response = requests.get(url, params=params, timeout=settings.SERVICE_TIMEOUT)
    except requests.RequestException as exc:  # timeout, conexão recusada, DNS...
        logger.warning("Falha ao chamar %s: %s", url, exc)
        raise ServiceUnavailable(service) from exc
    if response.status_code >= 500:
        logger.warning("Serviço %s respondeu %s", service, response.status_code)
        raise ServiceUnavailable(service)
    return response


def exists(service: str, object_id: int) -> bool:
    """True se o id existe no outro serviço (usado para validar na escrita)."""
    response = _get(service, f"{RESOURCES[service]}/{object_id}/")
    if response.status_code == 404:
        return False
    if not response.ok:
        raise ServiceUnavailable(service)
    return True


def fetch_many(service: str, ids: set[int]) -> dict[int, dict]:
    """Busca vários objetos de uma vez (?ids=1,2,3) e devolve {id: objeto}."""
    if not ids:
        return {}
    response = _get(service, f"{RESOURCES[service]}/", {"ids": ",".join(map(str, sorted(ids)))})
    if not response.ok:
        raise ServiceUnavailable(service)
    return {item["id"]: item for item in response.json()}


def resolve(member_ids: set[int], project_ids: set[int]) -> dict[str, dict | None]:
    """Consulta users e projects EM PARALELO. None significa 'serviço indisponível'."""

    def safe(service: str, ids: set[int]):
        try:
            return fetch_many(service, ids)
        except ServiceUnavailable:
            return None

    with ThreadPoolExecutor(max_workers=2) as pool:
        members = pool.submit(safe, "users", member_ids)
        projects = pool.submit(safe, "projects", project_ids)
        return {"members": members.result(), "projects": projects.result()}


def ping(service: str) -> str:
    """Estado de um serviço dependente, para o health check detalhado."""
    try:
        return "ok" if _get(service, "health/").ok else "error"
    except ServiceUnavailable:
        return "unavailable"
