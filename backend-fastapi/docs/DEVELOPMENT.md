# [Project Name] - Development Guide

**Version**: 0.1.0
**Last Updated**: [Date]

---

## Quick Links

- **Getting Started**: See [docs/dev/quick-start.md](docs/dev/quick-start.md)
- **Architecture**: See [docs/dev/architecture.md](docs/dev/architecture.md)
- **Problems & Solutions**: See [docs/agent-history/problems-solved.md](docs/agent-history/problems-solved.md)
- **API Reference**: See [docs/API_Reference.md](docs/API_Reference.md)
- **Debugging**: See [docs/dev/debugging.md](docs/dev/debugging.md)
- **Prompts Library**: See [docs/agent-history/prompts.md](docs/agent-history/prompts.md)

---

## What Is This Project?

[Brief description of what this FastAPI backend does]

- **Purpose**: [Main goal of the API]
- **Key Features**: [List 3-5 main features]
- **Integrations**: [External services, databases, etc.]

---

## Tech Stack

```
Python 3.11+
FastAPI 0.100+
SQLAlchemy 2.0 (async)
Alembic (migrations)
Pydantic v2 (validation)
PostgreSQL (database)
uv (package manager)
pytest (testing)
```

---

## Project Status

🚧 **Current Version**: 0.1.0

**Completed**:
- [ ] Project scaffolding
- [ ] Database setup
- [ ] Authentication
- [ ] Core endpoints

**In Progress**:
- [ ] [Current feature]

**Planned**:
- [ ] [Future feature]

---

## For New Contributors

1. Read [docs/dev/quick-start.md](docs/dev/quick-start.md) - 5 min setup
2. Review [docs/dev/architecture.md](docs/dev/architecture.md) - understand structure
3. Check [docs/dev/problems-solved.md](docs/dev/problems-solved.md) - learn from past issues

---

## For Continuing Work

**Previous Session Context**: [docs/agent-history/session-context.md](docs/agent-history/session-context.md)

**Common Tasks**:
- Add endpoint → [docs/dev/common-tasks.md](docs/dev/common-tasks.md)
- Add model → [docs/dev/common-tasks.md](docs/dev/common-tasks.md)
- Fix bug → [docs/dev/debugging.md](docs/dev/debugging.md)
- Database migration → [docs/dev/migrations.md](docs/dev/migrations.md)

---

## Documentation Index

### User Documentation
- `README.md` - Installation and usage
- `docs/API_Reference.md` - API endpoints documentation
- `docs/deployment.md` - Deployment guide

### Developer Documentation
- `docs/dev/quick-start.md` - Setup and first run
- `docs/dev/architecture.md` - System design and patterns
- `docs/dev/debugging.md` - Troubleshooting guide
- `docs/dev/common-tasks.md` - How-to guides
- `docs/dev/migrations.md` - Database migration guide
- `docs/dev/testing.md` - Testing guide

### Agent History (AI Session Continuity)
- `docs/agent-history/session-context.md` - Session continuity
- `docs/agent-history/problems-solved.md` - Issues and solutions
- `docs/agent-history/prompts.md` - AI prompts that worked
- `docs/changelog.md` - Version history

### AI Context
- `CLAUDE.md` - Instructions for AI assistants

---

## Commands Reference

```bash
# Development
uv run uvicorn app.main:app --reload          # Start dev server
uv run pytest                                  # Run tests
uv run pytest -v --cov=app                    # Tests with coverage
uv run ruff check . --fix                     # Lint and auto-fix
uv run ruff format .                          # Format code

# Database
uv run alembic upgrade head                   # Apply migrations
uv run alembic revision --autogenerate -m ""  # Generate migration
uv run alembic downgrade -1                   # Rollback

# Type checking
uv run mypy app/                              # Type check
```

---

## Version History

See [docs/changelog.md](docs/changelog.md) for detailed history.

### v0.1.0 ([Date])
- Initial project setup

---

## Credits

**Developer**: [Your Name]
**AI Assistant**: Claude via Claude Code
