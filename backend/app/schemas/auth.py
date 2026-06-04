from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    organization_slug: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class CurrentPrincipal(BaseModel):
    user_id: str
    organization_id: str
    email: EmailStr | None = None
    full_name: str | None = None
    organization_slug: str | None = None
    organization_name: str | None = None
    roles: list[str]
    permissions: list[str] = []
    scope_type: str = "own"
    menu_views: list[str] = []
    workflow_actions: list[str] = []
