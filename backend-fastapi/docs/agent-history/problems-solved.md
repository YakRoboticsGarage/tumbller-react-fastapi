# Problems Solved

> **Purpose**: Document solutions to problems encountered during development.
> **Before debugging**: Search this file - the problem may have been solved before.

---

## Index by Category

- [x402 Payment Integration](#x402-payment-integration)
- [CORS & Middleware](#cors--middleware)
- [Database & Migrations](#database--migrations)
- [Authentication & Security](#authentication--security)
- [API & Routing](#api--routing)
- [Async & Concurrency](#async--concurrency)
- [Testing](#testing)
- [Performance](#performance)
- [Deployment](#deployment)
- [Dependencies](#dependencies)

---

## x402 Payment Integration

### x402 402 Response Missing CORS Headers

**Date**: 2024-12-28

**Symptoms**:
```
Frontend error: "Failed to fetch"
Browser console: CORS policy blocked - no 'Access-Control-Allow-Origin' header
Backend logs show 402 responses being sent correctly
```

**Root Cause**:
FastAPI middleware runs in LIFO (Last In, First Out) order. When middleware is added:
1. CORS middleware added first
2. x402 middleware added second

Request flow: `Request → x402 → CORS → Handler`
Response flow: `Handler → CORS → x402 → Response`

When x402 returns a 402 response directly (before reaching the handler), it bypasses CORS on the response path. The 402 response never passes through CORS middleware, so it has no CORS headers.

**Solution**:
Wrap x402 middleware to manually add CORS headers to 402 responses:

```python
# app/main.py
async def x402_with_cors_support(request: Request, call_next) -> Response:
    origin = request.headers.get("origin", "")

    # Skip x402 for OPTIONS requests (CORS preflight)
    if request.method == "OPTIONS":
        return await call_next(request)

    response = await x402_middleware(request, call_next)

    # Add CORS headers to 402 responses (x402 bypasses CORS middleware)
    if response.status_code == 402 and origin in settings.cors_origins:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Expose-Headers"] = "PAYMENT-REQUIRED, X-PAYMENT-RESPONSE"

    return response

app.middleware("http")(x402_with_cors_support)
```

**Prevention**:
- When adding middleware that returns responses directly (like x402), consider CORS implications
- Test API responses with browser fetch, not just curl (curl doesn't enforce CORS)
- Wrap payment/auth middleware to add CORS headers to error responses

**Related Files**: `app/main.py`

---

### x402 OPTIONS Preflight Returning 402

**Date**: 2024-12-28

**Symptoms**:
```
Browser console: OPTIONS request returns 402 Payment Required
CORS preflight fails before actual request
```

**Root Cause**:
x402 middleware intercepted OPTIONS requests and returned 402 because no payment header was present.

**Solution**:
Skip x402 middleware for OPTIONS requests:

```python
async def x402_with_cors_support(request: Request, call_next) -> Response:
    # Skip x402 for OPTIONS requests (CORS preflight)
    if request.method == "OPTIONS":
        return await call_next(request)
    return await x402_middleware(request, call_next)
```

**Prevention**:
- Always skip payment/auth middleware for OPTIONS requests
- CORS preflight should never require authentication or payment

**Related Files**: `app/main.py`

---

## CORS & Middleware

### CORS Not Exposing Custom Headers

**Date**: 2024-12-28

**Symptoms**:
```
Frontend JavaScript cannot read custom headers from response
response.headers.get('X-Custom-Header') returns null
Headers visible in browser Network tab but not accessible to JS
```

**Root Cause**:
CORS `Access-Control-Expose-Headers` not configured to expose custom headers. By default, only simple response headers are accessible to frontend JavaScript.

**Solution**:
Add custom headers to `expose_headers` in CORS config:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["PAYMENT-REQUIRED", "X-PAYMENT-RESPONSE"],  # Add custom headers here
)
```

**Prevention**:
- Always add custom response headers to `expose_headers`
- Document which headers are used by frontend

**Related Files**: `app/main.py`

---

## Database & Migrations

### [Problem Title]

**Date**: YYYY-MM-DD

**Symptoms**:
```
[Error message or unexpected behavior]
```

**Root Cause**:
[Why the problem occurred]

**Solution**:
```python
# Code or commands that fixed it
```

**Prevention**:
- [How to avoid this in the future]

**Related Files**: `path/to/file.py`

---

## Authentication & Security

### [Problem Title]

**Date**: YYYY-MM-DD

**Symptoms**:
```
[Error message]
```

**Root Cause**:
[Explanation]

**Solution**:
```python
```

**Prevention**:
- 

---

## API & Routing

### [Problem Title]

**Date**: YYYY-MM-DD

**Symptoms**:
```
```

**Root Cause**:


**Solution**:
```python
```

**Prevention**:
- 

---

## Async & Concurrency

### [Problem Title]

**Date**: YYYY-MM-DD

**Symptoms**:
```
```

**Root Cause**:


**Solution**:
```python
```

**Prevention**:
- 

---

## Testing

### [Problem Title]

**Date**: YYYY-MM-DD

**Symptoms**:
```
```

**Root Cause**:


**Solution**:
```python
```

**Prevention**:
- 

---

## Performance

### [Problem Title]

**Date**: YYYY-MM-DD

**Symptoms**:
```
```

**Root Cause**:


**Solution**:
```python
```

**Prevention**:
- 

---

## Deployment

### [Problem Title]

**Date**: YYYY-MM-DD

**Symptoms**:
```
```

**Root Cause**:


**Solution**:
```bash
```

**Prevention**:
- 

---

## Dependencies

### [Problem Title]

**Date**: YYYY-MM-DD

**Symptoms**:
```
```

**Root Cause**:


**Solution**:
```bash
```

**Prevention**:
- 

---

## Common FastAPI Issues (Reference)

Quick reference for common issues:

### Async Session Not Working
```python
# ❌ Wrong
def get_user(db: Session):
    return db.query(User).first()

# ✅ Correct
async def get_user(db: AsyncSession):
    result = await db.execute(select(User))
    return result.scalar_one_or_none()
```

### Pydantic V2 Migration Issues
```python
# ❌ Old (Pydantic v1)
class Config:
    orm_mode = True

# ✅ New (Pydantic v2)
model_config = ConfigDict(from_attributes=True)
```

### Circular Import
```python
# ❌ Causes circular import
from app.models.user import User  # at top of file

# ✅ Use TYPE_CHECKING
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from app.models.user import User
```

---

## How to Add Entries

When you solve a problem:

1. **Identify category** (or create new one)
2. **Copy the error message** exactly
3. **Document root cause** - why it happened
4. **Show the fix** - actual code, not description
5. **Add prevention** - how to avoid next time
6. **Link related files** - where the fix was applied

**Good entry** = Someone else can fix the same issue in 2 minutes

**Bad entry** = "Fixed the database thing"
