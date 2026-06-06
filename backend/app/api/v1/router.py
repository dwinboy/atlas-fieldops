from fastapi import APIRouter

from app.api.v1.routes import administration, auth, field_officers, forms, governance, health, mobile, operations, organization_governance, organizations, platform, projects, public, roles, submissions, surveys, users, users_teams

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(organizations.router, prefix="/organizations", tags=["organizations"])
api_router.include_router(platform.router, prefix="/platform", tags=["platform"])
api_router.include_router(public.router, prefix="/public", tags=["public website"])
api_router.include_router(administration.router, prefix="/administration", tags=["administration"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(users_teams.router, prefix="/users-teams", tags=["users & teams"])
api_router.include_router(roles.router, prefix="/roles", tags=["roles"])
api_router.include_router(field_officers.router, prefix="/field-officers", tags=["field officers"])
api_router.include_router(surveys.router, prefix="/surveys", tags=["surveys"])
api_router.include_router(forms.router, prefix="/forms", tags=["forms"])
api_router.include_router(submissions.router, prefix="/submissions", tags=["submissions"])
api_router.include_router(mobile.router, prefix="/mobile", tags=["mobile"])
api_router.include_router(operations.router, prefix="/operations", tags=["operations"])
api_router.include_router(governance.router, prefix="/governance", tags=["governance"])
api_router.include_router(organization_governance.router, prefix="/organization-governance", tags=["organization governance"])
