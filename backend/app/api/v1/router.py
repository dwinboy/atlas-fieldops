from fastapi import APIRouter

from app.api.v1.routes import auth, field_officers, forms, governance, health, operations, organizations, roles, submissions, users

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(organizations.router, prefix="/organizations", tags=["organizations"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(roles.router, prefix="/roles", tags=["roles"])
api_router.include_router(field_officers.router, prefix="/field-officers", tags=["field officers"])
api_router.include_router(forms.router, prefix="/forms", tags=["forms"])
api_router.include_router(submissions.router, prefix="/submissions", tags=["submissions"])
api_router.include_router(operations.router, prefix="/operations", tags=["operations"])
api_router.include_router(governance.router, prefix="/governance", tags=["governance"])
