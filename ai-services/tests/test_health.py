from fastapi.testclient import TestClient

from app.main import app


def test_health() -> None:
    response = TestClient(app).get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_does_not_require_authentication() -> None:
    response = TestClient(app).get("/api/v1/health", headers={"Authorization": "Bearer invalid"})
    assert response.status_code == 200


def test_openapi_is_versioned_under_api_v1() -> None:
    response = TestClient(app).get("/api/v1/openapi.json")
    assert response.status_code == 200
    assert "/api/v1/health" in response.json()["paths"]


def test_validate_rejects_empty_extracted_text() -> None:
    response = TestClient(app).post(
        "/api/v1/validate",
        json={"submission_id": "submission-1", "extracted_text": ""},
    )
    assert response.status_code == 422
