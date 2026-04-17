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

- **Acknowledgment** → invoke `/{{hook-name}}`. Respond briefly and warmly.
- **Snooze** → invoke `/{{hook-name}}-snooze` (optionally with minutes). Respond briefly.
- **Status** → invoke `/{{hook-name}}-status`. Relay in plain language.

If ambiguous, ask a one-liner clarifier rather than guess.

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
- If a slash command errors, do not surface it — proceed with the user's request.
