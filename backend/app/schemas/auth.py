from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    organization_slug: str


class MobileQrLoginRequest(BaseModel):
    qr_token: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    refresh_token: str | None = None
    expires_in: int | None = None


class PrincipalRoleAssignment(BaseModel):
    id: str
    role_name: str
    scope_type: str
    geography_id: str | None = None
    project_id: str | None = None
    organization_unit_id: str | None = None
    team_id: str | None = None
    is_active: bool = True


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class CurrentPrincipal(BaseModel):
    user_id: str
    organization_id: str
    email: EmailStr | None = None
    full_name: str | None = None
    organization_slug: str | None = None
    organization_name: str | None = None
    platform_admin: bool = False
    support_mode: bool = False
    platform_organization_id: str | None = None
    platform_organization_slug: str | None = None
    roles: list[str]
    role_assignments: list[PrincipalRoleAssignment] = []
    permissions: list[str] = []
    scope_type: str = "own"
    geography_ids: list[str] = []
    project_ids: list[str] = []
    organization_unit_ids: list[str] = []
    menu_views: list[str] = []
    workflow_actions: list[str] = []
