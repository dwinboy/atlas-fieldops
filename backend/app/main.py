from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from prometheus_fastapi_instrumentator import Instrumentator
from starlette.types import ASGIApp

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.events import event_publisher
from app.core.logging import configure_logging
from app.core.middleware import request_context_middleware


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    if settings.app_env != "test":
        await event_publisher.start()
    try:
        yield
    finally:
        await event_publisher.stop()


def create_app() -> ASGIApp:
    configure_logging()
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        openapi_url="/api/v1/openapi.json",
        docs_url="/api/v1/docs",
        lifespan=lifespan,
    )
    app.middleware("http")(request_context_middleware)
    app.include_router(api_router, prefix="/api/v1")
    FastAPIInstrumentor.instrument_app(app)
    if settings.enable_prometheus_metrics and settings.app_env != "test":
        Instrumentator().instrument(app).expose(app)

    return CORSMiddleware(
        app,
        allow_origins=settings.cors_origins,
        allow_origin_regex=settings.cors_origin_regex,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


app = create_app()
