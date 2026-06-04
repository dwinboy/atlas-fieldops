from fastapi.testclient import TestClient

from app.main import create_app
from app.schemas.identity import OrganizationContextRead


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


def test_frontend_origin_can_preflight_api_requests() -> None:
    client = TestClient(create_app())
    response = client.options(
        "/api/v1/auth/login",
        headers={
            "Origin": "http://127.0.0.1:3001",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://127.0.0.1:3001"


def test_frontend_origin_receives_cors_header_on_auth_errors() -> None:
    client = TestClient(create_app())
    response = client.get(
        "/api/v1/auth/me",
        headers={"Origin": "https://atlas-fieldops.vercel.app"},
    )

    assert response.status_code in {401, 403}
    assert response.headers["access-control-allow-origin"] == "https://atlas-fieldops.vercel.app"


def test_organization_context_schema_exposes_display_identity() -> None:
    payload = OrganizationContextRead(
        organization_id="00000000-0000-0000-0000-000000000001",
        name="Atlas Demo",
        slug="atlas-demo",
        roles=["owner"],
    )

    assert payload.name == "Atlas Demo"
    assert payload.slug == "atlas-demo"
    assert payload.logo_url is None
