# Logto Integration Guide

**Status**: Optional authentication - enabled via environment variable

---

## Quick Start

### Disabled (Default)

```env
VITE_ENABLE_AUTH=false  # No auth required
```

App runs without login.

### Enabled

When enabled, users must log in before accessing the robot control interface.

**1. Set up Logto Instance**

Option A: **Cloud (Recommended)**
- Sign up at https://cloud.logto.io/
- Create a new application (SPA type)
- Get your endpoint and app ID

Option B: **Self-hosted**
- Follow https://docs.logto.io/docs/tutorials/get-started/
- Run Logto locally or on your server

**2. Configure Application**

In Logto Console:
- **Redirect URIs**: `http://localhost:5173/callback`
- **Post sign-out redirect URIs**: `http://localhost:5173`

**3. Update `.env`**

```env
VITE_ENABLE_AUTH=true
VITE_LOGTO_ENDPOINT=https://your-tenant.logto.app
VITE_LOGTO_APP_ID=your-app-id
```

**4. Restart**

```bash
pnpm dev
```

Login button appears in header.

---

## Architecture

**Conditional Provider Pattern**

```
AuthProvider (src/providers/AuthProvider.tsx)
├── If VITE_ENABLE_AUTH=false → Renders children directly
└── If VITE_ENABLE_AUTH=true → Wraps with LogtoProvider
```

**Custom Hook** (`useAuth`)
- Auth disabled: Returns mock data (isAuthenticated: true)
- Auth enabled: Returns Logto hook data

**Components**
- `ProtectedRoute` - Wraps routes requiring authentication
- `LoginButton` - Only renders when auth enabled + logged out
- `LogoutButton` - Only renders when auth enabled + logged in
- `UserProfile` - Shows avatar/name when authenticated

**Callback Route**
- `/callback` - Handles OAuth redirect after login
- Auto-redirects to home after successful authentication

**Authentication Flow**
- When auth enabled and user not logged in → Shows login page
- User clicks "Log In" → Redirects to Logto
- After successful login → Redirects to `/callback` → Redirects to home
- Home page (RobotControlPage) now accessible

---

## File Structure

```
src/
├── providers/
│   └── AuthProvider.tsx       # Conditional Logto wrapper
├── hooks/
│   └── useAuth.ts             # Auth hook (conditional)
├── pages/
│   ├── RobotControlPage.tsx   # Main page (protected)
│   └── CallbackPage.tsx       # OAuth callback handler
├── components/common/
│   ├── ProtectedRoute.tsx     # Route protection wrapper
│   ├── LoginButton.tsx
│   ├── LogoutButton.tsx
│   └── UserProfile.tsx
└── vite-env.d.ts              # TypeScript env types
```

---

## Usage Examples

### Check if Auth Enabled

```typescript
import { useAuthEnabled } from '../hooks/useAuth';

const isAuthEnabled = useAuthEnabled();
```

### Get Auth State

```typescript
import { useAuth } from '../hooks/useAuth';

const { isAuthenticated, isLoading, fetchUserInfo } = useAuth();
```

### Login/Logout

```typescript
const { signIn, signOut } = useAuth();

// Login (redirects to /callback)
void signIn(window.location.origin + '/callback');

// Logout
void signOut(window.location.origin);
```

### Get User Info

```typescript
const { fetchUserInfo } = useAuth();

const userInfo = await fetchUserInfo();
// Returns: { name, username, email, avatar, ... }
```

### Get Access Token (for API calls)

```typescript
const { getAccessToken } = useAuth();

const token = await getAccessToken('https://your-api.com');
fetch('/api/endpoint', {
  headers: { Authorization: `Bearer ${token}` }
});
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_ENABLE_AUTH` | No (default: false) | Enable authentication |
| `VITE_LOGTO_ENDPOINT` | If auth enabled | Logto instance endpoint |
| `VITE_LOGTO_APP_ID` | If auth enabled | Logto application ID |

---

## Production Setup

**.env.production**

```env
VITE_ENABLE_AUTH=true
VITE_LOGTO_ENDPOINT=https://your-tenant.logto.app
VITE_LOGTO_APP_ID=your-prod-app-id
```

**Logto Console**
- Update redirect URIs to production domain (e.g., `https://yourdomain.com/callback`)
- Use different app IDs for dev/staging/prod

---

## Logto Cloud vs Self-Hosted

### Logto Cloud (Recommended)
- Managed service at https://cloud.logto.io/
- No infrastructure setup
- Automatic updates
- Free tier available

### Self-Hosted
- Full control over data
- Run on your infrastructure
- Requires Docker/Kubernetes
- See https://docs.logto.io/docs/tutorials/get-started/

---

## Troubleshooting

**Login button not showing**
- Check `VITE_ENABLE_AUTH=true` (exact match)
- Restart dev server after `.env` changes

**Configuration error**
- Verify `VITE_LOGTO_ENDPOINT` is a valid URL
- Ensure `VITE_LOGTO_APP_ID` is set correctly
- Check Logto Console for correct values

**Callback redirect fails**
- Verify redirect URI in Logto Console matches exactly: `http://localhost:5173/callback`
- Check browser console for errors
- Ensure `/callback` route exists in your app

**User info not showing**
- Check scopes in AuthProvider include Email, Phone, etc.
- Verify user has completed profile in Logto
- Check browser console for fetch errors

---

## Advanced Configuration

### Custom Scopes

Edit `src/providers/AuthProvider.tsx`:

```typescript
const config: LogtoConfig = {
  endpoint,
  appId,
  scopes: [
    UserScope.Email,
    UserScope.Phone,
    UserScope.CustomData,
    UserScope.Identities,
    UserScope.Organizations,  // Add organization support
  ],
};
```

### API Resources

```typescript
const config: LogtoConfig = {
  endpoint,
  appId,
  resources: ['https://your-api.com'],
  scopes: ['read:robots', 'write:robots'],
};
```

### Organization Support

For multi-tenant scenarios:

```typescript
const { getOrganizationToken } = useAuth();

const token = await getOrganizationToken('org-id');
```

---

## Security Notes

- Never commit `.env` files (already in `.gitignore`)
- Use HTTPS in production
- Rotate app secrets periodically
- Use separate app IDs for each environment

---

## Resources

- [Logto Documentation](https://docs.logto.io/)
- [Logto React SDK](https://docs.logto.io/quick-starts/react)
- [Logto Cloud](https://cloud.logto.io/)
- [GitHub Sample](https://github.com/logto-io/js/tree/master/packages/react-sample)
