# CLAUDE.md - Tumbller Full Stack Project

## Project Overview

**Purpose**: Tumbller is a full-stack application for robot control with a React frontend and FastAPI backend.

**Tech Stack**:
- Frontend: React 18, TypeScript, Vite 6, Chakra UI, React Query, Zustand
- Backend: Python 3.11+, FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2, PostgreSQL

## Project Structure

```
├── frontend-react/      # React SPA (see frontend-react/CLAUDE.md)
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── pages/       # Route pages
│   │   ├── hooks/       # Custom hooks
│   │   ├── services/    # API client
│   │   ├── stores/      # Zustand stores
│   │   └── theme/       # Chakra theme
│   └── docs/            # Frontend documentation
├── backend-fastapi/     # FastAPI backend (see backend-fastapi/docs/CLAUDE.md)
│   ├── app/
│   │   ├── api/         # Route handlers
│   │   ├── core/        # Config & security
│   │   ├── db/          # Database layer
│   │   ├── models/      # ORM models
│   │   ├── schemas/     # Pydantic schemas
│   │   └── services/    # Business logic
│   └── docs/            # Backend documentation
```

## Commands

```bash
# Frontend (in frontend-react/)
pnpm dev                    # Start dev server (http://localhost:5173)
pnpm build                  # Production build
pnpm check                  # lint + typecheck + test

# Backend (in backend-fastapi/)
uv run uvicorn app.main:app --reload    # Start dev server
uv run pytest                            # Run tests
uv run ruff check . --fix               # Lint and auto-fix

# Database (in backend-fastapi/)
uv run alembic upgrade head             # Apply migrations
uv run alembic revision --autogenerate -m ""  # Generate migration
```

## Documentation (Progressive Disclosure)

**Subproject documentation**: Each subproject has its own CLAUDE.md with detailed guidance:

| Subproject | CLAUDE.md Location | When to Read |
|------------|-------------------|--------------|
| Frontend | `frontend-react/CLAUDE.md` | Working on React UI, components, state management |
| Backend | `backend-fastapi/docs/CLAUDE.md` | Working on API, database, business logic |

**Additional docs**:

| File | When to Read |
|------|--------------|
| `frontend-react/docs/api-integration.md` | Frontend-backend API conventions |
| `frontend-react/docs/component-patterns.md` | React/Chakra component patterns |
| `backend-fastapi/DEVELOPMENT.md` | Backend development setup |
| `backend-fastapi/docs/agent-history/problems-solved.md` | Before debugging issues |

## Boundaries

✅ **Always**:
- Read the relevant subproject CLAUDE.md before making changes
- Run quality checks in both projects before committing:
  - Frontend: `pnpm check`
  - Backend: `uv run ruff check .` and `uv run pytest`
- Follow existing patterns in each subproject

⚠️ **Ask first**:
- Changes that affect both frontend and backend (API contracts)
- Database schema changes (affects both layers)
- Adding new dependencies to either project

🚫 **Never**:
- Commit `.env` files or secrets in either project
- Break API contracts without updating both sides
- Skip type safety (TypeScript strict mode, Python type hints)
