# AI Prompts Library

Effective prompts used during development with Claude Sonnet 4.5 via Claude Code.

---

## Project Setup

### Initial Project Creation

```
Read the Project_Prompt.md for the project instructions.
```

**Context:** Starting a new project from requirements document

**What worked:** Claude read requirements and asked clarifying questions about:
- Building from scratch vs modifying existing
- Framework preferences
- Deployment target

**Outcome:** Full project scaffold with React + Vite + TypeScript + Chakra UI

---

## ESP32 Investigation

### Understanding Camera Stream

```
Check this project for the esp32 and react project. Also compare the esp32
project with my esp-cam project whose url is in the Project_Prompt.md
https://github.com/andypmw/imata/tree/main/imata-device-esp32cam
```

**Context:** Camera stream wasn't working, needed to understand ESP-CAM architecture

**What worked:** Claude:
1. Fetched actual ESP32 firmware source code from GitHub
2. Read camera.ino and web server implementation
3. Discovered /stream serves HTML, not MJPEG
4. Found /getImage polling pattern

**Outcome:** Dual-mode camera implementation (iframe + polling)

---

## Theme Customization

### Applying Color Scheme

```
Now let's style the interface a little bit of theme. Are you using Chakra UIs?
I want a theme with orange, yellow, brown shades. Look for docs for theme
instructions if available
```

**Context:** Default Chakra blue theme didn't match desired aesthetic

**What worked:** Specific color family request (orange/yellow/brown) gave Claude:
- Clear color palette direction
- Industrial/warm aesthetic to aim for
- Freedom to create shade variations

**What didn't work initially:** Just saying "make it look better" would be too vague

**Outcome:** Custom theme with:
- Brand orange (#f97316)
- Accent yellow (#eab308)
- Brown neutrals for text
- Component style overrides

### Updating Theme Documentation

```
Update the docs/theme-customizations.md if needed and change our based on
it with orange, brown, yellow shades
```

**What worked:** Asking Claude to update docs to match implementation ensures consistency

**Outcome:** theme-customization.md reflects actual color values in code

---

## Bug Fixes

### Modal Won't Close

```
The dialog box to add the robot stays there after add robot button.
```

**Context:** UI bug - modal behavior not working

**What worked:**
- Short, specific description of observable behavior
- No assumptions about cause
- Let Claude investigate and propose solution

**What didn't work:** Would have been less effective to say "fix the callback" (assumes cause)

**Outcome:** Claude identified missing callback pattern and added `onSuccess` prop

### Connect Button Not Visible

**User's exact words:**
```
There is NO button to connect to the robot still. There is Robot status
with a dummy button that says not connected but I can't press it.
```

**Context:** After previous fix attempt, button still not rendering

**What worked:**
- **Emphatic clarity:** "There is NO button" - assertive, specific
- **Visual description:** "dummy button that says not connected but I can't press it"
- **Implicit debugging request:** The phrase "still" indicates previous attempts failed

**What made this effective:**
- User didn't accept Claude's first solution
- Provided precise observable state
- No technical jargon - described what they SEE

**Outcome:** Claude added debug logging, discovered state issue, simplified conditional logic

**Lesson:** Be specific about what you observe. If Claude's fix doesn't work, say so directly.

### Camera Stream Errors

```
in the stream only tab I get this message: No Camera Available, Unable to
connect to camera at 192.168.1.101
```

**Context:** Feature not working, error message visible

**What worked:**
- Exact error message quoted
- Specific mode mentioned ("stream only tab")
- IP address included for context

**Outcome:** Claude:
1. Investigated ESP-CAM implementation
2. Removed pre-flight check
3. Added retry tolerance
4. Implemented auto-recovery

### Layout Issues

```
the stream only is not centered but is shown left aligned
```

**Context:** Visual layout problem

**What worked:** Simple description of visual issue, no CSS terminology needed

**Outcome:** Claude added flex centering

---

## Workflow Requests

### Manual Connection

```
after selecting the robot, it should not automatically connect. There should
a button to connect which basically check if robot is online or offline.
```

**Context:** UX decision - wanted explicit control

**What worked:**
- Clear behavioral requirement
- Explicit rejection of auto-connect
- Described button purpose ("check if robot is online or offline")

**Outcome:** Connection state machine with manual trigger

### Dual Camera Modes

```
is it possible to just display the javascript webpage that the ESP-CAM
firmware is serving because that page also has some buttons
```

**Context:** Wanted access to camera's native controls

**What worked:**
- Phrased as question ("is it possible")
- Explained motivation ("that page also has some buttons")

**Outcome:** Claude added iframe mode alongside polling mode

---

## Documentation

### Initial Documentation Request

```
Now let's add a development summary and the problems faced so that someone
else can also use the prompts and docs and debug problems. We should also be
able to have the context for the next session. Let's also version it so that
we can track it.
```

**Context:** End of session, wanted continuity documentation

**What worked:**
- Multi-purpose goals: handoff, debugging reference, session continuity
- Explicit mention of versioning
- Mentioned "prompts" - signal to document what worked

**Outcome:** Initial large DEVELOPMENT.md created

### Modular Documentation

```
Let's break down the development.md into small chunks for smaller context and
progressive disclose like mentioned here -
https://www.humanlayer.dev/blog/writing-a-good-claude-md
```

**Context:** Large monolithic doc was hard to navigate

**What worked:**
- Reference to specific methodology (HumanLayer)
- Provided link for Claude to read
- Term "progressive disclosure" gave clear structure goal

**Outcome:** Hub-and-spoke documentation structure with separate detail files

---

## Version Control

### Git Commit

```
Now I would like to commit this to github. Do you have skill to do that?
```

**What worked:** Direct question about capability before proceeding

**Outcome:** Claude used commit skill, handled:
- Git initialization
- Staging files
- Crafting commit message
- Maintaining commit message format

---

## Communication Patterns That Work

### 1. Be Specific and Observable

**Good:**
```
There is NO button to connect to the robot
```

**Less effective:**
```
The connection stuff isn't working
```

### 2. Quote Error Messages Exactly

**Good:**
```
in the stream only tab I get this message: No Camera Available, Unable to
connect to camera at 192.168.1.101
```

**Less effective:**
```
Camera doesn't work
```

### 3. Describe What You Want, Not How

**Good:**
```
I want a theme with orange, yellow, brown shades
```

**Less effective:**
```
Change the brand.500 color to #f97316
```

(Though the second can work if you know exactly what you want)

### 4. Push Back When Fixes Don't Work

**Good:**
```
There is NO button to connect to the robot still.
```

**Less effective:**
(Silently accepting broken solution)

### 5. Provide Context Links

**Good:**
```
Check this project for the esp32 and react project: [GitHub URL]
```

**Why:** Let Claude read actual source code instead of guessing

### 6. Ask About Capabilities

**Good:**
```
Do you have skill to do that?
```

**Why:** Clarifies what Claude can do vs what requires manual steps

---

## Prompts That Didn't Work Well

### Vague Requests

```
Make it better
```

**Problem:** No specific direction
**Better:** "I want a warm, industrial theme with orange tones"

### Assuming Too Much Knowledge

```
Fix the useEffect dependency array
```

**Problem:** Claude needs to know WHICH component and WHAT issue
**Better:** "Camera stream causes infinite re-render loop"

### Multiple Unrelated Requests

```
Fix the button, change the theme, and add authentication
```

**Problem:** Too much at once
**Better:** One request at a time, verify each works

---

## Effective Debugging Prompts

### When Something Doesn't Work

1. **Describe observable behavior:** "Button doesn't appear"
2. **Specify context:** "After selecting robot from dropdown"
3. **Include error messages:** Copy exact console errors
4. **Mention what you already tried:** "Refreshed page, still doesn't work"

### When You Need Investigation

```
Check the ESP32 source code at [URL] to understand how the camera stream works
```

**Why effective:** Gives Claude authority to research vs guess

---

## Session Continuity

### Starting New Session

**For future sessions, start with:**
```
Read DEVELOPMENT.md and docs/dev/session-context.md to understand the project
```

**Why:** Progressive disclosure ensures Claude gets:
1. Quick overview from hub
2. Current state from session-context
3. Deep dive into specific areas as needed

---

## Meta-Prompts (Prompts About Documentation)

### This Document

```
Let's also add the prompts that worked well during development
```

**Context:** Within larger documentation request

**Outcome:** This prompts.md file

**Why useful:** Future developers (or AI assistants) can see what communication patterns work

---

## Key Takeaways

1. **Specificity beats assumptions** - "NO button" > "something wrong"
2. **Provide links** - Let Claude read actual code/docs
3. **Iterate** - If first solution doesn't work, say so
4. **Observable behavior** - Describe what you SEE, not what you think is broken
5. **One thing at a time** - Easier to verify and debug
6. **Ask about capabilities** - "Can you do X?" before "Do X"
7. **Reference methodology** - Link to articles/best practices when relevant

**Most Important:** Clear, direct communication. Treat Claude as a capable collaborator who needs good information to do good work.
