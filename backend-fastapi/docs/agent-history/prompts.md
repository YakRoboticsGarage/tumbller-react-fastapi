# Prompts Library

> **Purpose**: Store prompts that actually worked well in previous sessions.
> These are proven prompts - use them as-is or adapt for similar tasks.

---

## Index

- [API Development](#api-development)
- [Database](#database)
- [Testing](#testing)
- [Debugging](#debugging)
- [Refactoring](#refactoring)
- [Documentation](#documentation)

---

## API Development

### Implement Backend with Payment Toggle (Worked: 2024-12-27)

**Context**: Needed to implement FastAPI backend with optional payment gateway

**Prompt Used**:
```
let's start implementing the backend-fastapi. I want to be able to disable the payment gateway for testing the endpoints without payment when I need to and enable when I need to get payments
```

**Result**: Created PAYMENT_ENABLED toggle in config with conditional session validation in deps.py

**Notes**: Key insight was using environment variable with default=False for development

---

### Combine Related Endpoints (Worked: 2024-12-27)

**Context**: Had separate motor.py and camera.py routers that should be combined

**Prompt Used**:
```
The motor and camera are on the same robot. So they should be in some same file. Also the the service is not esp32 but a robot service. Please make changes according to this
```

**Result**: Combined into single robot.py router and robot.py service

**Notes**: Domain-driven design - group by entity (robot) not by function (motor/camera)

---

### Session-to-Resource Binding (Worked: 2024-12-27)

**Context**: Needed one wallet to control only one robot at a time

**Prompt Used**:
```
Front end is where the robots are added with mdns names like finland-tumbller-01 and the camera mdns name is just finland-tumbller-01-cam which are accessed via http://mdns-name.local. There could be multiple frontends connecting to the backend. The backend should allow one frontend to control only one robot at a time. The backend keeps track if the robot is online via /info endpoint which returns mdns name and ip as json
```

**Result**: Implemented `_sessions` and `_robot_locks` dictionaries for wallet-to-robot binding

**Notes**: Gave full context about the system (frontend, mDNS, robot discovery) which helped design the right solution

---

## Database

### [No database prompts yet - using in-memory storage]

---

## Testing

### Write Tests for Manual Tests (Worked: 2024-12-27)

**Context**: After manually testing endpoints with curl, needed automated tests

**Prompt Used**:
```
Please write tests for the above tests we ran in the tests folder
```

**Result**: Created test suite with 26 tests covering all endpoints

**Notes**:
- Referencing "the above tests" worked because the conversation context included all the curl commands
- Tests needed fixtures for mocked robot service since real robot may be offline

---

### Fix Test Assertions (Worked: 2024-12-27)

**Context**: Tests were failing due to incorrect assertions

**Problem**: Tests expected `success` field but API returns `status`, expected 422 but got 401

**What Worked**: Running tests, reading error messages, fixing assertions to match actual API responses

**Notes**: Always run tests after writing to catch assertion mismatches

---

### Update Tests for Different Default (Worked: 2025-12-29)

**Context**: Tests expected `payment_enabled=False` but production `.env` has `True`

**Prompt Used**:
```
Let's modify the tests so that the default is payment enabled
```

**Result**:
- Created `create_test_app()` that bypasses x402 middleware
- Updated all assertions to expect `payment_enabled=True`
- Tests now match production configuration

**Notes**:
- Tests should match production defaults when possible
- When middleware intercepts requests, create test app without it

---

## Debugging

### [No debugging prompts yet]

---

## Refactoring

### Simplify Module with Library (Worked: 2025-12-29)

**Context**: Custom ENS implementation was ~200 lines with manual keccak256 hashing

**Prompt Used**:
```
@backend-fastapi/app/core/ens.py this can simplified with web3.py. Let's do that.
```

**Result**: Replaced entire implementation with ~40 lines using web3.py's built-in ENS support

**Notes**:
- Always check if a library already does what you're implementing manually
- web3.py handles namehash, resolver lookup, and address resolution automatically

---

### Handle Multiple Connection Types (Worked: 2024-12-27)

**Context**: Robot could be connected via mDNS name or IP address

**Prompt Used**:
```
The robot could be connected either via mdns or IP
```

**Result**: Added `_is_ip_address()` helper and conditional URL generation in robot service

**Notes**: Simple clarification led to handling both cases

---

## Documentation

### Update Agent History Files (Worked: 2024-12-27)

**Context**: After completing implementation, needed to update session context

**Prompt Used**:
```
read backend-fastapi/docs/DEVELOPMENT.md and let's update the agent-history files and changelog.md
```

**Result**: Updated session-context.md, changelog.md, and prompts.md with session details

**Notes**: Reference the DEVELOPMENT.md to understand the documentation structure

---

## Prompts That Didn't Work

> Learn from failures - document what NOT to do

### [No failed prompts documented yet]

---

## Tips for Writing Effective Prompts

Based on what worked in this project:

1. **Give full system context**: Explain frontend, hardware, network setup
2. **Be specific about constraints**: "one wallet controls one robot"
3. **Reference domain concepts**: Use real mDNS names like "finland-tumbller-01"
4. **Clarify when behavior differs from assumption**: "Robot can be online with camera offline"
5. **Request tests after implementation**: "write tests for the above tests"
6. **Use toggles for optional features**: "disable payment gateway for testing"

---

## How to Add Entries

When a prompt works well:

1. Copy the exact prompt you used
2. Note the context (what you were trying to do)
3. Record the result (what happened)
4. Add any tips for reuse
5. Include the date for reference

When a prompt fails:
1. Document it in "Prompts That Didn't Work"
2. Note what went wrong
3. Add what worked instead
