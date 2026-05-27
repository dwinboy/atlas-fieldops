from enum import StrEnum


class Permission(StrEnum):
    ORGANIZATION_READ = "organization:read"
    ORGANIZATION_MANAGE = "organization:manage"
    USER_READ = "user:read"
    USER_MANAGE = "user:manage"
    ROLE_READ = "role:read"
    ROLE_MANAGE = "role:manage"
    AUDIT_READ = "audit:read"


ROLE_PERMISSIONS: dict[str, set[Permission]] = {
    "owner": set(Permission),
    "admin": {
        Permission.ORGANIZATION_READ,
        Permission.USER_READ,
        Permission.USER_MANAGE,
        Permission.ROLE_READ,
        Permission.AUDIT_READ,
    },
    "manager": {
        Permission.ORGANIZATION_READ,
        Permission.USER_READ,
        Permission.ROLE_READ,
    },
    "collector": {
        Permission.ORGANIZATION_READ,
    },
}


def permissions_for_roles(roles: list[str]) -> set[Permission]:
    permissions: set[Permission] = set()
    for role in roles:
        permissions.update(ROLE_PERMISSIONS.get(role, set()))
    return permissions

