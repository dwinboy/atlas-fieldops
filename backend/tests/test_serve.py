from __future__ import annotations

import pytest

from app.cli.serve import resolve_port


def test_resolve_port_defaults_to_8000() -> None:
    assert resolve_port("") == 8000


def test_resolve_port_accepts_railway_port() -> None:
    assert resolve_port("12345") == 12345


def test_resolve_port_rejects_literal_shell_placeholder() -> None:
    with pytest.raises(RuntimeError, match="PORT must be an integer"):
        resolve_port("$PORT")
