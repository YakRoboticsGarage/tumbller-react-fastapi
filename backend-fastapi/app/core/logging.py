"""
Logging configuration for YakRover backend.
Logs to both console and daily rotating files (/app/logs/yakrover-YYYY-MM-DD.log).
"""

import logging
import sys
from pathlib import Path
from logging.handlers import TimedRotatingFileHandler

# Log directory - mounted as volume in Docker
LOG_DIR = Path("/app/logs")
LOG_FILE = LOG_DIR / "yakrover.log"

# Fallback for local development
if not LOG_DIR.exists():
    LOG_DIR = Path("./logs")
    LOG_DIR.mkdir(exist_ok=True)
    LOG_FILE = LOG_DIR / "yakrover.log"


def setup_logging(level: str = "INFO") -> logging.Logger:
    """
    Configure logging to output to both console and daily rotating file.

    Args:
        level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)

    Returns:
        Root logger configured for the application

    Log files are named yakrover.log (current) and yakrover.log.YYYY-MM-DD (past days).
    Keeps 30 days of logs.
    """
    # Create logs directory if it doesn't exist
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)

    # Log format
    log_format = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
    date_format = "%Y-%m-%d %H:%M:%S"
    formatter = logging.Formatter(log_format, datefmt=date_format)

    # Root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, level.upper(), logging.INFO))

    # Clear existing handlers
    root_logger.handlers.clear()

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)

    # File handler with daily rotation (new file each day, keep 30 days)
    file_handler = TimedRotatingFileHandler(
        LOG_FILE,
        when="midnight",
        interval=1,
        backupCount=30,
        encoding="utf-8",
    )
    file_handler.suffix = "%Y-%m-%d"
    file_handler.setFormatter(formatter)
    root_logger.addHandler(file_handler)

    # Reduce noise from third-party libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)

    root_logger.info(f"Logging initialized. File: {LOG_FILE}")

    return root_logger


def get_logger(name: str) -> logging.Logger:
    """Get a logger for a specific module."""
    return logging.getLogger(name)
