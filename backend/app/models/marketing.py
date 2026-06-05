from sqlalchemy import JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin


class MarketingLead(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "marketing_leads"

    name: Mapped[str] = mapped_column(String(220), nullable=False)
    organization: Mapped[str] = mapped_column(String(220), nullable=False, default="")
    country: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    email: Mapped[str] = mapped_column(String(320), nullable=False, index=True)
    phone: Mapped[str] = mapped_column(String(80), nullable=False, default="")
    organization_size: Mapped[str] = mapped_column(String(80), nullable=False, default="")
    interest_area: Mapped[str] = mapped_column(String(160), nullable=False, default="")
    source: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    message: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(40), nullable=False, default="new", index=True)
    metadata_json: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False, default=dict)
