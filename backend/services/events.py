"""Event bus for broadcasting realtime updates to connected clients.

`main.py` registers a publisher on startup; routers import `publish` to
emit events from sync request handlers without circular imports.
"""

from typing import Callable, Optional

_publisher: Optional[Callable[[dict], None]] = None


def register_publisher(fn: Callable[[dict], None]) -> None:
    global _publisher
    _publisher = fn


def publish(event_type: str, **payload) -> None:
    """Best-effort fire-and-forget event broadcast. Never raises."""
    if _publisher is None:
        return
    try:
        _publisher({"type": event_type, **payload})
    except Exception:
        pass
