"""Server-side binary storage.

A thin abstraction over where the platform keeps binary content (export artifacts, uploaded
media). The default backing is the database (`stored_files`), which is durable across redeploys
and needs no external credentials. A production deployment can replace the body of these methods
with object storage (S3/GCS) behind the same interface without touching callers.
"""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.operations import StoredFile


class StorageService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def save(
        self,
        *,
        organization_id: UUID,
        kind: str,
        file_name: str,
        media_type: str,
        content: bytes,
        reference_type: str | None = None,
        reference_id: str | None = None,
    ) -> StoredFile:
        stored = StoredFile(
            organization_id=organization_id,
            kind=kind,
            file_name=file_name,
            media_type=media_type,
            size_bytes=len(content),
            content=content,
            reference_type=reference_type,
            reference_id=reference_id,
        )
        self.session.add(stored)
        await self.session.flush()
        return stored

    async def load(self, organization_id: UUID, file_id: UUID) -> StoredFile | None:
        result = await self.session.execute(
            select(StoredFile).where(
                StoredFile.organization_id == organization_id,
                StoredFile.id == file_id,
            )
        )
        return result.scalar_one_or_none()

    async def list_for_reference(
        self, organization_id: UUID, reference_type: str, reference_id: str
    ) -> list[StoredFile]:
        result = await self.session.execute(
            select(StoredFile).where(
                StoredFile.organization_id == organization_id,
                StoredFile.reference_type == reference_type,
                StoredFile.reference_id == reference_id,
            )
        )
        return list(result.scalars().all())
