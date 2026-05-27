from fastapi import APIRouter, FastAPI
from pydantic import BaseModel, Field


class ValidationRequest(BaseModel):
    submission_id: str
    extracted_text: str = Field(min_length=1)


class ValidationResponse(BaseModel):
    submission_id: str
    confidence: float
    flags: list[str]


app = FastAPI(
    title="AI Services",
    version="0.1.0",
    docs_url="/api/v1/docs",
    openapi_url="/api/v1/openapi.json",
)
router = APIRouter(prefix="/api/v1")


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/validate", response_model=ValidationResponse)
async def validate_submission(payload: ValidationRequest) -> ValidationResponse:
    confidence = min(0.95, max(0.25, len(payload.extracted_text) / 500))
    flags = [] if confidence >= 0.7 else ["needs_human_review"]
    return ValidationResponse(
        submission_id=payload.submission_id,
        confidence=round(confidence, 2),
        flags=flags,
    )


app.include_router(router)
