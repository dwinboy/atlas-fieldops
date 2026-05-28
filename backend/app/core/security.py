from datetime import UTC, datetime, timedelta
from typing import Any, cast

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def create_access_token(
    subject: str,
    organization_id: str,
    roles: list[str],
    *,
    scope_type: str | None = None,
    geography_ids: list[str] | None = None,
    project_ids: list[str] | None = None,
    organization_unit_ids: list[str] | None = None,
) -> str:
    if not settings.jwt_secret:
        raise RuntimeError("JWT_SECRET must be configured")
    expires_at = datetime.now(UTC) + timedelta(minutes=settings.access_token_expire_minutes)
    payload: dict[str, Any] = {
        "sub": subject,
        "organization_id": organization_id,
        "roles": roles,
        "scope_type": scope_type,
        "geography_ids": geography_ids or [],
        "project_ids": project_ids or [],
        "organization_unit_ids": organization_unit_ids or [],
        "exp": expires_at,
    }
    return cast(str, jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm))


def decode_access_token(token: str) -> dict[str, Any]:
    if not settings.jwt_secret:
        raise ValueError("Invalid access token")
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:
        raise ValueError("Invalid access token") from exc
    return cast(dict[str, Any], payload)
