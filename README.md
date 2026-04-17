# Humane Hook Template

Scaffold for building [Humane Hooks](https://github.com/humane-hooks) — Claude Code extensions that respect the human behind the keyboard.

---

> ### 👋 Just ran `setup.sh`? Replace this README.
>
> This file describes *the template*, not your hook. Before you publish, rewrite it so someone landing on your repo understands what your hook does and how to live with it.
>
> **A good hook README covers, in order:**
>
> 1. **One-line pitch** — what the reminder is and when it fires.
> 2. **How it works** — the `UserPromptSubmit` loop, what state gets tracked, how the agent decides what to say.
> 3. **Staleness tiers** — a table of your thresholds (`fresh` / `standard` / `firmer` / `insistent` / `welcome-back`) and what Claude does in each.
> 4. **Install** — `./install.sh` with the `--global` / `--project` variants.
> 5. **Slash commands** — the three `/{{hook-name}}`, `/{{hook-name}}-snooze`, `/{{hook-name}}-status` commands and what each does.
> 6. **Configuration** — where to tune thresholds, plus env vars: `{{HOOK_ENV_PREFIX}}_DISABLED`, `{{HOOK_ENV_PREFIX}}_STATE_DIR`, `CLAUDE_CONFIG_DIR`.
> 7. **Uninstall** — `./uninstall.sh` and what it does/doesn't touch.
> 8. **Development** — `node --test tests/`, zero deps, pointer to `TESTING.md` and `CONTRIBUTING.md`.
> 9. **Read first** — link to `MANIFESTO.md`.
>
> For working examples, see [`drink-water`](https://github.com/humane-hooks/drink-water) and [`stretch-break`](https://github.com/humane-hooks/stretch-break). Match their voice — short, concrete, no hype.
>
> Delete this callout once your README is written.

---

## Quick start

1. Click "Use this template" on GitHub (or clone manually)
2. Run the setup script:

```bash
./setup.sh your-hook-name
```

3. Customize your hook:
   - `hooks/your-hook-name.js` — thresholds and agent instructions
   - `skills/your-hook-name/SKILL.md` — tone guidance for the agent
4. Run tests: `node --test tests/your-hook-name.test.js`
5. Install: `./install.sh`

## What you get

- Hook script with full lifecycle pre-wired (state, staleness, I/O, CLI)
- Install/uninstall scripts with atomic settings.json merging
- Skill file teaching the agent how to respond
- Slash commands for explicit control
- Test suite with `node:test` (zero deps)
- CI workflow (GitHub Actions, Node 18/20/22)

## What you customize

- **Thresholds** — how long before each reminder tier kicks in
- **Instructions** — what the agent should say at each tier
- **Tone** — hook-specific examples in the SKILL.md

Everything else works out of the box.

## Read first

- [Manifesto](MANIFESTO.md) — design principles, the "Is it a Humane Hook?" checklist, and anti-patterns to avoid
- [Contributing](CONTRIBUTING.md) — ground rules for patches

## License

MIT
