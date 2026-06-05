from sqlalchemy.ext.asyncio import AsyncSession

from app.models.marketing import MarketingLead
from app.schemas.marketing import MarketingLeadCreate, MarketingLeadRead


class MarketingService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_lead(self, payload: MarketingLeadCreate) -> MarketingLeadRead:
        lead = MarketingLead(
            name=payload.name.strip(),
            organization=payload.organization.strip(),
            country=payload.country.strip(),
            email=str(payload.email).lower(),
            phone=payload.phone.strip(),
            organization_size=payload.organization_size.strip(),
            interest_area=payload.interest_area.strip(),
            source=payload.source.strip() or "website",
            message=payload.message.strip(),
            metadata_json=payload.metadata,
        )
        self.session.add(lead)
        await self.session.commit()
        await self.session.refresh(lead)
        return MarketingLeadRead(
            id=lead.id,
            name=lead.name,
            organization=lead.organization,
            country=lead.country,
            email=lead.email,
            phone=lead.phone,
            organization_size=lead.organization_size,
            interest_area=lead.interest_area,
            source=lead.source,
            message=lead.message,
            status=lead.status,
            created_at=lead.created_at,
        )
