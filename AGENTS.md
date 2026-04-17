# {{Hook-Name}} — for agents

This is a Claude Code humane hook that reminds the user at considerate intervals. Part of the [Humane Hooks](https://github.com/humane-hooks) project.

## If the hook is installed

Read `skills/{{hook-name}}/SKILL.md` for instructions on handling `<{{hook-name}}-reminder>` blocks and natural-language acknowledgments.

## If you are developing this hook

- Entry point: `hooks/{{hook-name}}.js` (single file, CommonJS, Node.js stdlib only)
- Tests: `tests/{{hook-name}}.test.js`, run with `node --test tests/{{hook-name}}.test.js`
- Install logic: `install.sh` + `scripts/merge-settings.js`

Keep the dependency count at zero. Keep the state file minimal. Keep the hook silent when nothing is needed — never block the user's workflow on the hook's own bugs.

## Principles

See [MANIFESTO.md](MANIFESTO.md).
