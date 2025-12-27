# Problems Solved

> **Purpose**: Document solutions to problems encountered during development.
> **Before debugging**: Search this file - the problem may have been solved before.

---

## Index by Category

- [Database & Migrations](#database--migrations)
- [Authentication & Security](#authentication--security)
- [API & Routing](#api--routing)
- [Async & Concurrency](#async--concurrency)
- [Testing](#testing)
- [Performance](#performance)
- [Deployment](#deployment)
- [Dependencies](#dependencies)

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
