# React + Vite + Chakra UI Application

A modern React SPA built with Vite for fast development and Chakra UI for accessible, composable components.

## Tech Stack

- **Framework**: React 18 with TypeScript
- **Build**: Vite 6
- **UI**: Chakra UI v2 with Emotion
- **Routing**: React Router v6
- **State**: React Query (server state) + Zustand (client state)
- **Forms**: React Hook Form + Zod validation
- **Testing**: Vitest + React Testing Library + Playwright

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── common/          # Generic components (Button, Modal, etc.)
│   └── features/        # Feature-specific components
├── pages/               # Route page components
├── hooks/               # Custom React hooks
├── services/            # API client and service functions
├── stores/              # Zustand stores
├── theme/               # Chakra theme customization
├── utils/               # Helper functions
└── types/               # TypeScript types/interfaces
```

## Commands

```bash
# Development
pnpm dev                    # Start dev server (http://localhost:5173)
pnpm build                  # Production build to dist/
pnpm preview                # Preview production build

# Quality
pnpm lint                   # ESLint check
pnpm lint --fix             # ESLint auto-fix
pnpm typecheck              # TypeScript check (no emit)
pnpm test                   # Run Vitest
pnpm test:coverage          # Vitest with coverage
pnpm e2e                    # Playwright E2E tests

# Combined
pnpm check                  # lint + typecheck + test
```

## Key Patterns

**Components**: Prefer composition over configuration. Use Chakra's `as` prop for semantic HTML. Extract complex logic to custom hooks.

**API calls**: Use React Query's `useQuery`/`useMutation`. API functions live in `services/`. Never call fetch directly in components.

**Forms**: React Hook Form with Zod schemas. Schemas define validation, types inferred from schemas.

**Theming**: Extend Chakra theme in `theme/index.ts`. Use semantic tokens for colors. Component styles in `theme/components/`.

## Documentation

Read these before working on specific areas:

- `docs/component-patterns.md` - Component architecture and Chakra patterns
- `docs/api-integration.md` - React Query setup and API conventions
- `docs/testing-guide.md` - Test patterns and Playwright setup
- `docs/theme-customization.md` - Chakra theme extension guide

## Boundaries

**Always:**
- Run `pnpm check` before committing
- Use TypeScript strict mode (no `any` unless justified)
- Follow existing component patterns in similar files
- Write tests for new features

**Ask first:**
- Before adding new dependencies
- Before modifying theme foundations
- Before changing Vite configuration

**Never:**
- Commit `.env` files or API keys
- Use inline styles (use Chakra props or `sx`)
- Disable TypeScript/ESLint rules without comment explaining why
