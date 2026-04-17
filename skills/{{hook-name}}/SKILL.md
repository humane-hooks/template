---
name: {{hook-name}}
description: Use when the user acknowledges the {{hook-name}} reminder, wants to snooze, or asks about status. Also use when a <{{hook-name}}-reminder> block appears in the conversation — follow its instruction and pick the right action (ack / snooze / defer).
---

# {{Hook-Name}} Skill

{{Hook-Name}} nudges the user at humane intervals. When a `<{{hook-name}}-reminder>` block appears in the conversation, follow its instruction. When the user responds naturally, recognize and handle it.

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

If ambiguous, ask a one-liner clarifier rather than guess.

### About `/{{hook-name}}` slash commands

The `/{{hook-name}}`, `/{{hook-name}}-snooze`, and `/{{hook-name}}-status` slash commands exist for the **user** to type themselves. They work via a `UserPromptSubmit` hook that intercepts the action token — a path that doesn't fire when you (the agent) invoke them via the Skill tool. Don't try to route through them; use the Bash CLI above.

## Tone guidance

<!-- CUSTOMIZE: Write hook-specific tone examples for each staleness tier -->

**Standard band:** [Write your standard-band tone here]

**Firmer band:** [Write your firmer-band tone here]

**Insistent band:** [Write your insistent-band tone here]

**Late hours:** [Describe late-night tone adaptation]

**Welcome-back:** [Describe warm return greeting]

## What NOT to do

- Do not scold, lecture, or moralize.
- Do not add unsolicited stats or tracking.
- Do not invoke the skill for unrelated mentions in code or conversation.
- If the Bash call returns no output or errors, do not surface it — proceed with the user's request.
