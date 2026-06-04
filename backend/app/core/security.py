from datetime import UTC, datetime, timedelta
import os
from typing import Any, cast

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def get_jwt_secret() -> str:
    secret = os.environ.get("JWT_SECRET", "").strip()
    if len(secret) < 32:
        raise RuntimeError("JWT_SECRET must be configured")
    return secret


def create_access_token(
    subject: str,
    organization_id: str,
    roles: list[str],
    *,
    email: str | None = None,
    full_name: str | None = None,
    organization_slug: str | None = None,
    organization_name: str | None = None,
    platform_admin: bool = False,
    support_mode: bool = False,
    platform_organization_id: str | None = None,
    platform_organization_slug: str | None = None,
    scope_type: str | None = None,
    geography_ids: list[str] | None = None,
    project_ids: list[str] | None = None,
    organization_unit_ids: list[str] | None = None,
) -> str:
    secret = get_jwt_secret()
    expires_at = datetime.now(UTC) + timedelta(minutes=settings.access_token_expire_minutes)
    payload: dict[str, Any] = {
        "sub": subject,
        "organization_id": organization_id,
        "email": email,
        "full_name": full_name,
        "organization_slug": organization_slug,
        "organization_name": organization_name,
        "platform_admin": platform_admin,
        "support_mode": support_mode,
        "platform_organization_id": platform_organization_id,
        "platform_organization_slug": platform_organization_slug,
        "roles": roles,
        "scope_type": scope_type,
        "geography_ids": geography_ids or [],
        "project_ids": project_ids or [],
        "organization_unit_ids": organization_unit_ids or [],
        "exp": expires_at,
    }
    return cast(str, jwt.encode(payload, secret, algorithm=settings.jwt_algorithm))


def decode_access_token(token: str) -> dict[str, Any]:
    try:
        secret = get_jwt_secret()
        payload = jwt.decode(token, secret, algorithms=[settings.jwt_algorithm])
    except (JWTError, RuntimeError) as exc:
        raise ValueError("Invalid access token") from exc
    return cast(dict[str, Any], payload)
