from enum import StrEnum


class Permission(StrEnum):
    ORGANIZATION_READ = "organization:read"
    ORGANIZATION_MANAGE = "organization:manage"
    USER_READ = "user:read"
    USER_MANAGE = "user:manage"
    ROLE_READ = "role:read"
    ROLE_MANAGE = "role:manage"
    AUDIT_READ = "audit:read"
    FORM_READ = "form:read"
    FORM_MANAGE = "form:manage"
    OFFICER_READ = "officer:read"
    OFFICER_MANAGE = "officer:manage"
    SUBMISSION_READ = "submission:read"
    SUBMISSION_CREATE = "submission:create"
    SUBMISSION_REVIEW = "submission:review"
    SYNC_MOBILE = "sync:mobile"


ROLE_PERMISSIONS: dict[str, set[Permission]] = {
    "owner": set(Permission),
    "organization_admin": {
        Permission.ORGANIZATION_READ,
        Permission.USER_READ,
        Permission.USER_MANAGE,
        Permission.ROLE_READ,
        Permission.AUDIT_READ,
        Permission.FORM_READ,
        Permission.FORM_MANAGE,
        Permission.OFFICER_READ,
        Permission.OFFICER_MANAGE,
        Permission.SUBMISSION_READ,
        Permission.SUBMISSION_REVIEW,
    },
    "admin": {
        Permission.ORGANIZATION_READ,
        Permission.USER_READ,
        Permission.USER_MANAGE,
        Permission.ROLE_READ,
        Permission.AUDIT_READ,
        Permission.FORM_READ,
        Permission.FORM_MANAGE,
        Permission.OFFICER_READ,
        Permission.OFFICER_MANAGE,
        Permission.SUBMISSION_READ,
        Permission.SUBMISSION_REVIEW,
    },
    "supervisor": {
        Permission.ORGANIZATION_READ,
        Permission.USER_READ,
        Permission.ROLE_READ,
        Permission.FORM_READ,
        Permission.OFFICER_READ,
        Permission.SUBMISSION_READ,
        Permission.SUBMISSION_REVIEW,
    },
    "manager": {
        Permission.ORGANIZATION_READ,
        Permission.USER_READ,
        Permission.ROLE_READ,
        Permission.FORM_READ,
        Permission.OFFICER_READ,
        Permission.SUBMISSION_READ,
    },
    "field_officer": {
        Permission.ORGANIZATION_READ,
        Permission.FORM_READ,
        Permission.SUBMISSION_CREATE,
        Permission.SYNC_MOBILE,
    },
    "collector": {
        Permission.ORGANIZATION_READ,
        Permission.FORM_READ,
        Permission.SUBMISSION_CREATE,
        Permission.SYNC_MOBILE,
    },
}


def permissions_for_roles(roles: list[str]) -> set[Permission]:
    permissions: set[Permission] = set()
    for role in roles:
        permissions.update(ROLE_PERMISSIONS.get(role, set()))
    return permissions
