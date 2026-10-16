---
name: spec-impl-game
description: Implements an approved game spec by following /spec-impl exactly, then runs the skin-designer agent and, only after it finishes, the mobile-porter agent (sequential, never in parallel).
disable-model-invocation: true
argument-hint: <NN-juego-id>
allowed-tools: Read, Glob, Grep, Edit, Write, Agent, AskUserQuestion, Bash(git status:*), Bash(git branch:*), Bash(git checkout:*), Bash(git log:*), Bash(git diff:*), Bash(git stash:*), Bash(cat:*), Bash(ls:*)
---

# /spec-impl-game — Game spec implementer + skins + mobile

## Session context

Current repository state:
!`git status --short`

Current branch:
!`git branch --show-current`

Specs available in this folder:
!`ls specs/ 2>/dev/null || echo "The specs/ folder does not exist"`

Branch-creation config:
!`cat specs/.spec-config.yml 2>/dev/null || echo "AutoCreateBranch: true (default, no config file)"`

---

## Instructions

The received argument is: `$ARGUMENTS`

Three stages, in strict order. **Never advance to the next stage until the previous one has fully finished.**

---

### Stage A — /spec-impl

`/spec-impl` cannot be invoked through the Skill tool (`disable-model-invocation`), so run it by hand: **Read `.agents/skills/spec-impl/SKILL.md` and follow its Phases 1–4 exactly**, using `$ARGUMENTS` as the spec argument. The session context above is the same one that skill expects. Do not duplicate or reinterpret its rules (Approved-state validation, `spec-NN-slug` branch, step-by-step pauses for diff review, never commit).

**Stop here — do not launch any agent — if** `/spec-impl` stops: spec not found, state is not Approved, uncommitted changes left unresolved, or the user declines to continue.

Before implementing, check the spec describes a game (usually `NN-juego-<id>.md`; adds an entry to `GAME_REGISTRY`). If it does not, warn the user and ask whether to still run Stages B and C after the implementation.

Stage A ends when `/spec-impl` prints its final "✅ All steps of the plan are implemented." Note the game `id` and the active branch.

---

### Stage B — agent `skin-designer`

Launch it with the Agent tool (`subagent_type: "skin-designer"`), in the foreground, in a single call. Prompt it with: the game `id`, the spec path, the active branch, and "audit and add the `bisel / plano / neon / contorno` skins to the newly implemented game; do not commit".

**Wait for it to finish.** Then summarize for the user: files touched and the assumptions it reported.

---

### Stage C — agent `mobile-porter`

Only after Stage B has finished, launch it (`subagent_type: "mobile-porter"`), in the foreground. Prompt it with: the game `id`, the routes `/juegos/<id>` and `/juegos/<id>/jugar`, the files the skin-designer changed, and "audit and fix the mobile experience (touch pad, layout, fullscreen) for the new game; desktop must not change; do not commit".

If the Playwright MCP server is unavailable, tell the user instead of faking the audit.

**Wait for it to finish.** Then summarize files touched and assumptions.

**Hard rule:** never launch `skin-designer` and `mobile-porter` in the same message or in parallel.

---

### Closing

Show a final summary: spec, branch, and files touched per stage (A, B, C). Remind the user to verify the spec's acceptance criteria one by one, mark the spec as "Implemented", and make the commit themselves — nothing has been committed.
