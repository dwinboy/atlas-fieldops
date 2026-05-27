from pydantic import BaseModel


class SubmissionCreatedEvent(BaseModel):
    event_version: int = 1
    organization_id: str
    submission_id: str
    form_id: str
    occurred_at: str

