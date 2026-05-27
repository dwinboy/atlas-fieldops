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
    roles: list[str]

