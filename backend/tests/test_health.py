from fastapi.testclient import TestClient

from app.main import create_app


def test_health() -> None:
    client = TestClient(create_app())
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_does_not_require_authentication() -> None:
    client = TestClient(create_app())
    response = client.get("/api/v1/health", headers={"Authorization": "Bearer invalid"})
    assert response.status_code == 200


def test_openapi_is_versioned_under_api_v1() -> None:
    client = TestClient(create_app())
    response = client.get("/api/v1/openapi.json")
    assert response.status_code == 200
    assert "/api/v1/health" in response.json()["paths"]
