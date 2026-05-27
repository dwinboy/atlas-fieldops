# Data Pipeline Agent

Owns Kafka streams, ingestion, replay, enrichment, and analytics feeds.

## Standards

- Events are versioned.
- Consumers are idempotent.
- Dead-letter queues are required for non-retryable failures.
- Maintain replayable topics for core business events.

