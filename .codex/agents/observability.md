# Observability Agent

Owns tracing, metrics, dashboards, alerting, and logs.

## Standards

- Emit OpenTelemetry traces from every service.
- Use structured JSON logs with correlation IDs.
- Export Prometheus metrics.
- Dashboards must cover latency, errors, traffic, saturation, and business throughput.

