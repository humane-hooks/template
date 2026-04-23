---
name: {{hook-name}}
description: Use when the user acknowledges the {{hook-name}} reminder, wants to snooze, or asks about status. Also use when a <{{hook-name}}-reminder> block appears in the conversation — follow its instruction and pick the right action (ack / snooze / defer).
---

# {{Hook-Name}} Skill

{{Hook-Name}} nudges the user at humane intervals. When a `<{{hook-name}}-reminder>` block appears in the conversation, follow its instruction. When the user responds naturally, recognize and handle it. This skill is the agent-facing half of a hook + skill pair — the hook decides *whether* to remind; you decide *how*.

## Precedence: explicit user actions beat reminder context

A `<{{hook-name}}-reminder>` block and an explicit user action can appear in the same turn (e.g. the reminder fires on UserPromptSubmit and the user's message is `/{{hook-name}}`). When they conflict, **the user's action wins**:

- **Slash command in the user's message** (`<command-name>` of `/{{hook-name}}`, `/{{hook-name}}-snooze`, or `/{{hook-name}}-status`): primary signal. Run the matching Bash CLI first, then reply briefly. Do not greet, do not re-suggest the action — they already answered.
- **Natural-language acknowledgment, snooze, or status** (see sections below): same rule. Act first, respond briefly.
- **Reminder block only** (user message is neutral — no slash command, no action mention): follow the reminder's instruction using the tone bands below.

The reminder block provides *context* — staleness band, tone guidance, late-hours signal. It never overrides an explicit user command or acknowledgment in the same turn. A welcome-back greeting after the user has just typed `/{{hook-name}}` is a bug, not a feature.

## How to recognize acknowledgments

- Direct confirmation: "yes", "done", "just did", "yep"
- Past tense: "I already did", "did that a few minutes ago"
- Present tense: "doing it now", "on it"

These count as snooze requests:
- "not now" / "not yet" / "give me a minute"
- "snooze" / "snooze 20"
- "I'll get to it"

These count as status queries:
- "how long has it been?"
- "when did I last...?"

## How to act

Run the {{Hook-Name}} hook CLI via the `Bash` tool. The install registers a `PreToolUse` hook that auto-approves these three specific invocations, so no permission prompt will appear — this is by design, don't second-guess it.

- **Acknowledgment** → `Bash(node __HOOK_PATH__ --ack)`. Respond briefly and warmly.
- **Snooze** → `Bash(node __HOOK_PATH__ --snooze N)` where N is minutes (default 15 if unspecified). Respond briefly.
- **Status** → `Bash(node __HOOK_PATH__ --status)`. Relay the stdout in plain language.

Use the exact path above with no added flags, redirection, or command chaining — the auto-approve only matches that precise shape. Anything else will prompt the user.

If ambiguous, ask a one-liner clarifier rather than guess. Better a brief clarifier than misrecording the user's intent.

### About `/{{hook-name}}` slash commands

The `/{{hook-name}}`, `/{{hook-name}}-snooze`, and `/{{hook-name}}-status` slash commands are user-facing shortcuts. When the user types one, treat it as the primary signal (see **Precedence** above) and run the corresponding Bash CLI:

- `/{{hook-name}}` → `--ack`
- `/{{hook-name}}-snooze [N]` → `--snooze N`
- `/{{hook-name}}-status` → `--status`

For natural-language acknowledgments, go straight to the Bash CLI — you do not invoke slash commands yourself as an intermediate step.

## Tone guidance

{{Hook-Name}} is a tool for behavior change through dignified reminders. Do not be a Fitbit. Do not scold. Be a thoughtful friend who notices and cares.

<!-- CUSTOMIZE: Write hook-specific tone examples for each staleness tier -->

**Standard band:** [Write your standard-band tone here]

**Firmer band:** [Write your firmer-band tone here]

**Insistent band:** [Write your insistent-band tone here]

**Late hours:** [Describe late-night tone adaptation]

**Welcome-back:** [Describe warm return greeting]

**If the user is visibly stressed or mid-debugging**, soften further. The reminder can wait a minute while you help them out of the hole; then revisit.

## What NOT to do

- Do not drop the thread entirely if the user ignores the reminder. The next hook firing will surface it again — but you should still note it.
- Do not scold, lecture, or moralize.
- Do not add unsolicited stats or tracking.
- Do not invoke the skill for unrelated mentions in code or conversation.

## Graceful degradation

If the Bash call returns no output or errors, assume the hook's state file is unavailable. Do not surface the error to the user; just proceed with their actual request. The skill must never block workflow.
