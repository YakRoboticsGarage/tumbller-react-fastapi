# CLAUDE.md - FastAPI Backend Project

## Project Overview

**Purpose**: [Brief description of what this API does and the problem it solves]

**Tech Stack**: Python 3.11+, FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2, PostgreSQL, uv

## Project Structure

```
├── app/
│   ├── api/              # API route handlers
│   │   ├── v1/           # Version 1 endpoints
│   │   └── deps.py       # Shared dependencies
│   ├── core/             # Core configuration
│   │   ├── config.py     # Settings & environment
│   │   └── security.py   # Auth utilities
│   ├── db/               # Database layer
│   │   ├── base.py       # SQLAlchemy base
│   │   └── session.py    # Database session
│   ├── models/           # SQLAlchemy ORM models
│   ├── schemas/          # Pydantic schemas
│   ├── services/         # Business logic layer
│   └── main.py           # FastAPI application entry
├── alembic/              # Database migrations
├── tests/                # Test suite
├── docs/                 # Documentation
│   └── dev/              # Developer documentation
└── scripts/              # Utility scripts
```

## Commands

```bash
# Development
uv run uvicorn app.main:app --reload          # Start dev server
uv run pytest                                  # Run all tests
uv run pytest -v --cov=app                    # Tests with coverage
uv run ruff check . --fix                     # Lint and auto-fix
uv run ruff format .                          # Format code

# Database
uv run alembic upgrade head                   # Apply migrations
uv run alembic revision --autogenerate -m ""  # Generate migration
```

## Documentation (Progressive Disclosure)

**Start here**: Read `DEVELOPMENT.md` for full documentation index.

Before working, read the relevant docs:

| File | When to Read |
|------|--------------|
| `DEVELOPMENT.md` | Main index - start here for everything |
| `docs/agent-history/session-context.md` | Continuing previous work |
| `docs/agent-history/problems-solved.md` | Before debugging any issue |
| `docs/agent-history/prompts.md` | Reference prompts that worked in past sessions |
| `docs/changelog.md` | Before making changes - understand recent history |

## Boundaries

✅ **Always**:
- Run `uv run ruff check .` and `uv run pytest` before committing
- Use existing patterns from `app/api/v1/` for new endpoints
- Add Pydantic schemas for all request/response models
- Write tests for new endpoints in `tests/`

⚠️ **Ask first**:
- Database schema changes (migrations affect production)
- Adding new dependencies to `pyproject.toml`
- Modifying `app/core/config.py` or security settings

🚫 **Never**:
- Commit `.env` files or secrets
- Modify `alembic/versions/` files directly (generate new migrations)
- Skip type hints on function signatures
- Remove failing tests without explicit approval
