'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

// ╔══════════════════════════════════════════════════════════════════════╗
// ║  CUSTOMIZE — Adjust everything in this section for your hook.      ║
// ║  The engine below this block is reusable machinery you shouldn't   ║
// ║  need to touch.                                                    ║
// ╚══════════════════════════════════════════════════════════════════════╝

// --- Threshold constants ---
// These control when reminders fire and how urgent they feel.
// TODO: Tune these for your hook's cadence. Defaults mirror a ~60/90/120/240 min pattern.
const MINUTE_MS = 60 * 1000;
const FRESH_CEILING_MS   = 60  * MINUTE_MS;  // TODO: Under this → no reminder at all
const FIRMER_FLOOR_MS    = 90  * MINUTE_MS;  // TODO: Past this → "firmer" tone
const INSISTENT_FLOOR_MS = 120 * MINUTE_MS;  // TODO: Past this → "insistent" tone
const WELCOME_BACK_FLOOR_MS = 240 * MINUTE_MS; // TODO: Past this → "welcome back" tone

// Anti-double-injection window: suppress repeated reminders within this window
// for the "standard" staleness band. Increase if your hook's cadence is slower.
const ANTI_DOUBLE_INJECTION_MS = 10 * MINUTE_MS;

// Default snooze duration when the user doesn't specify minutes.
const DEFAULT_SNOOZE_MIN = 15;

// --- Instructions ---
// TODO: Rewrite every value below. These are the actual words Claude sees
//       when deciding how to remind the user. Make them specific to YOUR hook.
const INSTRUCTIONS = {
  standard:
    "Before responding to the user's message, briefly check in about {{hook-name}}. " +
    "Be thoughtful about tone — late hours call for care, not nagging. " +
    "If they acknowledge, invoke /{{hook-name}}. If they want to snooze, invoke /{{hook-name}}-snooze. " +
    "If they don't mention it, you may proceed but do not drop the thread.",
  firmer:
    "This is a direct reminder — it has been a while since the last {{hook-name}} event. " +
    "Address the check-in first, briefly but clearly, then proceed with the user's request.",
  insistent:
    "Significant time has passed. Do not proceed with the user's request until you have gently " +
    "but clearly asked them about {{hook-name}}. This is the point of the tool.",
  'welcome-back':
    "The user has been away for a while, or is starting a new day. Greet them warmly and check in " +
    "about {{hook-name}}. No guilt about the gap.",
};

// ╔══════════════════════════════════════════════════════════════════════╗
// ║  END CUSTOMIZE — Everything below is the hook engine.              ║
// ╚══════════════════════════════════════════════════════════════════════╝

// ---------------------------------------------------------------------------
// State persistence
// ---------------------------------------------------------------------------

function resolveStatePath() {
  if (process.env['{{HOOK_ENV_PREFIX}}_STATE_DIR']) {
    return path.join(process.env['{{HOOK_ENV_PREFIX}}_STATE_DIR'], 'state.json');
  }
  if (process.env.CLAUDE_CONFIG_DIR) {
    return path.join(process.env.CLAUDE_CONFIG_DIR, '{{hook-name}}', 'state.json');
  }
  const home = os.homedir();
  if (!home) {
    // Containers without HOME set — avoid creating a relative .claude/ path
    // in whatever directory the hook happened to run from.
    throw new Error('Cannot resolve state path: no HOME and no CLAUDE_CONFIG_DIR set.');
  }
  return path.join(home, '.claude', '{{hook-name}}', 'state.json');
}

function readState(statePath = resolveStatePath()) {
  try {
    const raw = fs.readFileSync(statePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed.last_event_at) throw new Error('missing last_event_at');
    return {
      last_event_at: parsed.last_event_at,
      snooze_until: parsed.snooze_until ?? null,
      last_injected_at: parsed.last_injected_at ?? null,
      _humane_hook_marker: parsed._humane_hook_marker ?? null,
      _existed: true,
    };
  } catch (_err) {
    return {
      last_event_at: new Date().toISOString(),
      snooze_until: null,
      last_injected_at: null,
      _humane_hook_marker: null,
      _existed: false,
    };
  }
}

function writeState(state, statePath = resolveStatePath()) {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  const tmp = statePath + '.tmp';
  const payload = JSON.stringify({
    last_event_at: state.last_event_at,
    snooze_until: state.snooze_until,
    last_injected_at: state.last_injected_at,
    _humane_hook_marker: '{{hook-name}}',
  }, null, 2);
  fs.writeFileSync(tmp, payload);
  fs.renameSync(tmp, statePath);
}

// ---------------------------------------------------------------------------
// Staleness classification
// ---------------------------------------------------------------------------

function classifyStaleness(lastEventMs, nowMs) {
  const gap = nowMs - lastEventMs;
  if (gap < FRESH_CEILING_MS) return 'fresh';
  if (gap < FIRMER_FLOOR_MS) return 'standard';
  if (gap < INSISTENT_FLOOR_MS) return 'firmer';
  if (gap < WELCOME_BACK_FLOOR_MS) return 'insistent';
  return 'welcome-back';
}

function isSnoozed(snoozeUntilIso, now) {
  if (!snoozeUntilIso) return false;
  return new Date(snoozeUntilIso).getTime() > now.getTime();
}

function shouldSuppressStandardRefire(lastInjectedAtIso, now) {
  if (!lastInjectedAtIso) return false;
  const lastMs = new Date(lastInjectedAtIso).getTime();
  return (now.getTime() - lastMs) < ANTI_DOUBLE_INJECTION_MS;
}

function isLateHours(now) {
  const h = now.getHours();
  return h >= 22 || h < 6;
}

// ---------------------------------------------------------------------------
// Output formatting
// ---------------------------------------------------------------------------

function buildReminderText({ gapMinutes, localTime, lateSuffix, staleness }) {
  return (
    '<{{hook-name}}-reminder>\n' +
    'last_event: ' + gapMinutes + ' minutes ago\n' +
    'local_time: ' + localTime + lateSuffix + '\n' +
    'staleness: ' + staleness + '\n' +
    'instruction: ' + (INSTRUCTIONS[staleness] ?? '') + '\n' +
    '</{{hook-name}}-reminder>\n'
  );
}

function formatHookOutput(additionalContext) {
  return JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext,
    },
  }) + '\n';
}

// ---------------------------------------------------------------------------
// Hook input (stdin from Claude Code)
// ---------------------------------------------------------------------------

function readHookInput() {
  try {
    if (process.stdin.isTTY) return null;
    const raw = fs.readFileSync(0, 'utf8');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_err) {
    return null;
  }
}

// ---------------------------------------------------------------------------
// CLI commands
// ---------------------------------------------------------------------------

// Handle /{{hook-name}}[-status|-snooze N] inline from UserPromptSubmit input.
// Returns true if the prompt was a recognized slash command (caller should
// return without further work). This avoids any Bash tool call (and the
// permission prompt that comes with it) for the slash-command path.
function handleSlashCommand(promptText, now) {
  const trimmed = (promptText || '').trim();
  // Check longer prefixes first — `/{{hook-name}}` is a prefix of the others.
  if (trimmed === '/{{hook-name}}-status' || trimmed.startsWith('/{{hook-name}}-status ')) {
    emitStatusContext(now);
    return true;
  }
  if (trimmed === '/{{hook-name}}-snooze' || trimmed.startsWith('/{{hook-name}}-snooze ')) {
    const rest = trimmed.slice('/{{hook-name}}-snooze'.length).trim();
    const parsed = parseInt(rest, 10);
    const minutes = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_SNOOZE_MIN;
    cmdSnooze([String(minutes)], now);
    process.stdout.write(formatHookOutput(
      '<{{hook-name}}-action-result>\n' +
      'event: snooze\n' +
      'minutes: ' + minutes + '\n' +
      'instruction: Reply with one short line confirming the snooze duration. Do not invoke any tools.\n' +
      '</{{hook-name}}-action-result>\n'
    ));
    return true;
  }
  if (trimmed === '/{{hook-name}}' || trimmed.startsWith('/{{hook-name}} ')) {
    cmdAck(now);
    process.stdout.write(formatHookOutput(
      '<{{hook-name}}-action-result>\n' +
      'event: ack\n' +
      'result: Timer reset.\n' +
      'instruction: Reply with one short warm line and move on. Do not invoke any tools.\n' +
      '</{{hook-name}}-action-result>\n'
    ));
    return true;
  }
  return false;
}

function emitStatusContext(now) {
  try {
    const statePath = resolveStatePath();
    const state = readState(statePath);
    if (!state._existed) {
      process.stdout.write(formatHookOutput(
        '<{{hook-name}}-action-result>\n' +
        'event: status\n' +
        'result: not-initialized\n' +
        'instruction: Tell the user {{Hook-Name}} is not yet initialized; the next prompt will set it up.\n' +
        '</{{hook-name}}-action-result>\n'
      ));
      return;
    }
    const lastMs = new Date(state.last_event_at).getTime();
    const gapMin = Math.round((now.getTime() - lastMs) / MINUTE_MS);
    const staleness = classifyStaleness(lastMs, now.getTime());
    const snoozed = isSnoozed(state.snooze_until, now);
    process.stdout.write(formatHookOutput(
      '<{{hook-name}}-action-result>\n' +
      'event: status\n' +
      'last_event_min_ago: ' + gapMin + '\n' +
      'staleness: ' + staleness + '\n' +
      'snoozed: ' + (snoozed ? ('yes, until ' + state.snooze_until) : 'no') + '\n' +
      'instruction: Relay this status in one plain-language sentence. Do not invoke any tools.\n' +
      '</{{hook-name}}-action-result>\n'
    ));
  } catch (_err) {}
}

function cmdCheck(now = new Date()) {
  try {
    if (process.env['{{HOOK_ENV_PREFIX}}_DISABLED'] === '1') return;

    // Slash-command dispatch: handle /{{hook-name}}[-status|-snooze N] directly
    // in the hook to avoid a Bash tool call (which would trigger a permission
    // prompt under any `permissions.ask:["Bash"]` setting).
    const input = readHookInput();
    if (input && typeof input.prompt === 'string') {
      const handled = handleSlashCommand(input.prompt, now);
      if (handled) return;
    }

    const statePath = resolveStatePath();
    const state = readState(statePath);

    // First run: create state, emit welcome, return.
    if (!state._existed) {
      writeState(
        {
          last_event_at: now.toISOString(),
          snooze_until: null,
          last_injected_at: null,
        },
        statePath
      );
      const welcome =
        '<{{hook-name}}-reminder>\n' +
        '{{Hook-Name}} is now enabled and tracking from this moment.\n' +
        'Mention this to the user so they know install succeeded.\n' +
        '</{{hook-name}}-reminder>\n';
      process.stdout.write(formatHookOutput(welcome));
      return;
    }

    if (isSnoozed(state.snooze_until, now)) return;

    const lastMs = new Date(state.last_event_at).getTime();
    const staleness = classifyStaleness(lastMs, now.getTime());
    if (staleness === 'fresh') return;

    // Anti-double-injection: only in the standard band.
    if (staleness === 'standard' && shouldSuppressStandardRefire(state.last_injected_at, now)) {
      return;
    }

    const gapMinutes = Math.round((now.getTime() - lastMs) / MINUTE_MS);
    const localTime = now.toLocaleTimeString('en-US', {
      hour12: false, hour: '2-digit', minute: '2-digit',
    });
    const lateSuffix = isLateHours(now) ? ' (late)' : '';

    const reminderText = buildReminderText({ gapMinutes, localTime, lateSuffix, staleness });
    process.stdout.write(formatHookOutput(reminderText));

    // Record injection so anti-double-fire can reference it.
    writeState({ ...state, last_injected_at: now.toISOString() }, statePath);
  } catch (_err) {
    // Never block the user's workflow on this hook's own bugs.
  }
}

// Silent on success: the slash-command / skill instructs the agent to
// provide a single warm reply. Anything printed here would duplicate that.
function cmdAck(now = new Date()) {
  try {
    const statePath = resolveStatePath();
    const state = readState(statePath);
    writeState(
      {
        last_event_at: now.toISOString(),
        snooze_until: null,
        last_injected_at: state.last_injected_at,
      },
      statePath
    );
  } catch (_err) {}
}

function cmdSnooze(args = [], now = new Date()) {
  try {
    const parsed = parseInt(args[0], 10);
    const minutes = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_SNOOZE_MIN;
    const statePath = resolveStatePath();
    const state = readState(statePath);
    const snoozeUntil = new Date(now.getTime() + minutes * MINUTE_MS).toISOString();
    writeState(
      {
        last_event_at: state.last_event_at,
        snooze_until: snoozeUntil,
        last_injected_at: state.last_injected_at,
      },
      statePath
    );
  } catch (_err) {}
}

function cmdStatus(now = new Date()) {
  try {
    const statePath = resolveStatePath();
    const state = readState(statePath);
    if (!state._existed) {
      process.stdout.write('{{Hook-Name}} not yet initialized. You will see a confirmation on your next prompt.\n');
      return;
    }
    const lastMs = new Date(state.last_event_at).getTime();
    const gapMin = Math.round((now.getTime() - lastMs) / MINUTE_MS);
    const staleness = classifyStaleness(lastMs, now.getTime());
    const snoozed = isSnoozed(state.snooze_until, now);
    const snoozeLine = snoozed ? 'yes, until ' + state.snooze_until : 'no';
    process.stdout.write(
      'Last event: ' + gapMin + ' minutes ago (' + staleness + ')\n' +
      'Snoozed: ' + snoozeLine + '\n'
    );
  } catch (_err) {}
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function main(argv = process.argv) {
  const cmd = argv[2];
  if (cmd === '--check') cmdCheck();
  else if (cmd === '--ack') cmdAck();
  else if (cmd === '--snooze') cmdSnooze(argv.slice(3));
  else if (cmd === '--status') cmdStatus();
  else process.stdout.write('Usage: {{hook-name}}.js --check | --ack | --snooze [minutes] | --status\n');
}

if (require.main === module) main(process.argv);

module.exports = {
  resolveStatePath, readState, writeState,
  classifyStaleness, isSnoozed, shouldSuppressStandardRefire, isLateHours,
  buildReminderText, formatHookOutput, cmdCheck,
  cmdAck, cmdSnooze, cmdStatus, main,
};
