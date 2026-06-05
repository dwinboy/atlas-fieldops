from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class UsersTeamsSummaryRead(BaseModel):
    total_users: int = 0
    active_users: int = 0
    inactive_users: int = 0
    suspended_users: int = 0
    pending_invitations: int = 0
    locked_accounts: int = 0
    teams: int = 0
    organizations: int = 1
    roles: int = 0
    pending_access_requests: int = 0
    active_sessions: int = 0
    high_risk_sessions: int = 0
    permission_alerts: int = 0
    recent_activity: int = 0
    access_health_score: float = Field(default=100, ge=0, le=100)


class UsersTeamsActivityLogRead(BaseModel):
    id: UUID
    user_id: UUID | None = None
    user_label: str | None = None
    action: str
    resource_type: str
    resource_id: str
    status: str = "recorded"
    ip_address: str | None = None
    device: str | None = None
    location: str | None = None
    metadata: dict[str, object] = Field(default_factory=dict)
    created_at: datetime

