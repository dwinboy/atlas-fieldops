# Security Baseline

- JWT signing secrets must come from environment variables.
- Services must fail closed when JWT signing secrets are missing.
- Passwords are hashed with bcrypt.
- Auth tokens must be rejected when expired, malformed, or signed with an unexpected key.
- API routes must require explicit dependency-based authorization.
- Role checks must return 401 for invalid credentials and 403 for authenticated principals without the required role.
- Health checks and OpenAPI documents are intentionally exposed under `/api/v1` and must not disclose secrets.
- Audit sensitive identity, membership, role, submission, and AI-review changes.
- Never log credentials, tokens, raw secrets, or full OCR payloads containing sensitive data.
- Use least-privilege service accounts in Kubernetes.
- Run dependency scanning in CI.
