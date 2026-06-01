import json
from typing import Any

from aiokafka import AIOKafkaProducer
import structlog

from app.core.config import settings

logger = structlog.get_logger(__name__)


class EventPublisher:
    def __init__(self) -> None:
        self._producer: AIOKafkaProducer | None = None

    async def start(self) -> None:
        if self._producer is not None:
            return
        if not settings.kafka_bootstrap_servers.strip():
            logger.warning("event_publisher_disabled", reason="kafka_bootstrap_servers_not_configured")
            return
        try:
            self._producer = AIOKafkaProducer(bootstrap_servers=settings.kafka_bootstrap_servers)
            await self._producer.start()
        except Exception as exc:
            self._producer = None
            logger.warning("event_publisher_start_failed", error=str(exc))

    async def stop(self) -> None:
        if self._producer is None:
            return
        await self._producer.stop()
        self._producer = None

    async def publish(self, topic: str, event: dict[str, Any]) -> None:
        if self._producer is None:
            logger.warning("event_publisher_not_started", topic=topic, event_type=event.get("type"))
            return
        try:
            await self._producer.send_and_wait(
                topic,
                json.dumps(event, sort_keys=True).encode("utf-8"),
            )
        except Exception as exc:
            logger.warning("event_publish_failed", topic=topic, event_type=event.get("type"), error=str(exc))


event_publisher = EventPublisher()
