"""
Structured logging with correlation IDs for request tracing.
"""
import logging
import sys
import uuid
from contextvars import ContextVar
from datetime import datetime
from typing import Optional

# Context variable for correlation ID
correlation_id_var: ContextVar[Optional[str]] = ContextVar("correlation_id", default=None)


class CorrelationIdFilter(logging.Filter):
    """Add correlation ID to all log records."""
    
    def filter(self, record):
        record.correlation_id = correlation_id_var.get() or "no-correlation-id"
        return True


def get_correlation_id() -> str:
    """Get current correlation ID or generate a new one."""
    cid = correlation_id_var.get()
    if not cid:
        cid = str(uuid.uuid4())[:8]
        correlation_id_var.set(cid)
    return cid


def set_correlation_id(cid: str) -> None:
    """Set correlation ID for current context."""
    correlation_id_var.set(cid)


def setup_logging(level: str = "INFO") -> logging.Logger:
    """
    Configure structured logging with correlation IDs.
    
    Returns:
        Configured logger instance
    """
    # Create formatter with structured output
    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(correlation_id)s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    console_handler.addFilter(CorrelationIdFilter())
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, level.upper()))
    
    # Remove existing handlers to avoid duplicates
    root_logger.handlers.clear()
    root_logger.addHandler(console_handler)
    
    # Reduce noise from third-party libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    
    return root_logger


def get_logger(name: str) -> logging.Logger:
    """Get a logger instance with the given name."""
    logger = logging.getLogger(name)
    return logger


# Application loggers
api_logger = get_logger("api")
auth_logger = get_logger("auth")
violations_logger = get_logger("violations")
admin_logger = get_logger("admin")
