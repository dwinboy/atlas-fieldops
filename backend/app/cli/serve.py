from __future__ import annotations

import os

import uvicorn


def resolve_port(raw_port: str | None = None) -> int:
    value = raw_port or os.getenv("PORT") or "8000"
    try:
        return int(value)
    except ValueError as exc:
        raise RuntimeError(f"PORT must be an integer, got {value!r}") from exc


def main() -> None:
    uvicorn.run(
        "app.main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=resolve_port(),
        proxy_headers=True,
    )


if __name__ == "__main__":
    main()
