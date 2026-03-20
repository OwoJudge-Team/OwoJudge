/**
 * Discord webhook logger.
 * Patches console.log / info / warn / error so every server log is also
 * forwarded to the Discord channel configured via DISCORD_WEBHOOK_URL.
 *
 * Rate-limiting: Discord allows ~30 requests / minute per webhook.
 * We flush up to 2 pendng messages every 4 seconds via a simple queue.
 */

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const QUEUE_LENGTH_LIMIT = 500;

// Capture native console methods before any patching so we can log
// internal discord-logger errors without triggering infinite recursion.
const _nativeWarn = console.warn.bind(console);

interface QueuedMessage {
  content: string;
  color: number;
}

const queue: QueuedMessage[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

const LEVEL_COLORS: Record<string, number> = {
  LOG:   0x5865f2, // Discord blurple
  INFO:  0x57f287, // green
  WARN:  0xfee75c, // yellow
  ERROR: 0xed4245, // red
};

/** Truncate a string to Discord's embed description limit (4096 chars). */
function truncate(s: string, max = 4000): string {
  return s.length > max ? s.slice(0, max - 3) + '...<message too long>' : s;
}

/** Post a single embed to Discord. Returns false on error (caller can retry / drop). */
async function postToDiscord(msg: QueuedMessage): Promise<boolean> {
  if (!DISCORD_WEBHOOK_URL) return false;
  try {
    const res = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [
          {
            description: '```\n' + msg.content + '\n```',
            color: msg.color,
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });
    if (!res.ok && res.status !== 204) {
      const body = await res.text().catch(() => '');
      _nativeWarn(`[discord-logger] Discord returned ${res.status}: ${body}`);
      return false;
    }
    return true;
  } catch (err) {
    // Never crash the server due to logging failures
    _nativeWarn('[discord-logger] fetch to Discord failed:', err);
    return false;
  }
}

let flushing = false;

/** Drain up to 2 messages from the queue in sequence (stay within rate-limit). */
async function flush(): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    const batch = queue.splice(0, 2);
    for (const msg of batch) {
      await postToDiscord(msg);
    }
  } finally {
    flushing = false;
  }
}

/** Force-flush up to 5 messages immediately. Returns counts for diagnostics. */
export async function forceFlush(): Promise<{ attempted: number; succeeded: number }> {
  const batch = queue.splice(0, 5);
  let succeeded = 0;
  for (const msg of batch) {
    if (await postToDiscord(msg)) succeeded++;
  }
  return { attempted: batch.length, succeeded };
}

/** Start the background flush interval once a DISCORD_WEBHOOK_URL is available. */
function startFlushTimer(): void {
  if (flushTimer) return;
  flushTimer = setInterval(() => {
    if (queue.length > 0) {
      flush().catch(() => {/* swallow */});
    }
  }, 2000); // every 2 s — 1 msg/s max = well under Discord's 30 req/min
  // Don't keep the process alive solely for logging
  if (flushTimer.unref) flushTimer.unref();
}

/** Enqueue a message for delivery to Discord. */
function enqueue(level: string, args: unknown[]): void {
  if (!DISCORD_WEBHOOK_URL) return;

  let text: string;
  try {
    text = args
      .map(a => (typeof a === 'string' ? a : JSON.stringify(a, null, 2)))
      .join(' ');
  } catch {
    text = args.map(a => String(a)).join(' ');
  }

  queue.push({
    content: truncate(`[${level}] ${text}`),
    color: LEVEL_COLORS[level] ?? LEVEL_COLORS.LOG,
  });

  // Safety valve: don't let queue grow unbounded if Discord is unreachable
  if (queue.length > QUEUE_LENGTH_LIMIT) queue.splice(0, queue.length - QUEUE_LENGTH_LIMIT);

  // Trigger an immediate flush after this event-loop tick, so messages
  // don't have to wait up to 2 s for the background timer.
  setImmediate(() => { flush().catch(() => {}); });
}

/** Return the current queue length and whether the logger is installed. */
export function getDiscordLoggerStatus(): { installed: boolean; queueLength: number; webhookConfigured: boolean } {
  return { installed, queueLength: queue.length, webhookConfigured: !!DISCORD_WEBHOOK_URL };
}

/**
 * Call once at startup to patch the global console methods.
 * Safe to call multiple times (idempotent via guard flag).
 */
let installed = false;
export function setupDiscordLogger(): void {
  if (!DISCORD_WEBHOOK_URL) {
    console.warn('[discord-logger] DISCORD_WEBHOOK_URL is not set – Discord logging disabled.');
    return;
  }

  if (installed) return;
  installed = true;

  startFlushTimer();

  const originalLog   = console.log.bind(console);
  const originalInfo  = console.info.bind(console);
  const originalWarn  = console.warn.bind(console);
  const originalError = console.error.bind(console);

  console.log = (...args: unknown[]) => {
    originalLog(...args);
    enqueue('LOG', args);
  };

  console.info = (...args: unknown[]) => {
    originalInfo(...args);
    enqueue('INFO', args);
  };

  console.warn = (...args: unknown[]) => {
    originalWarn(...args);
    enqueue('WARN', args);
  };

  console.error = (...args: unknown[]) => {
    originalError(...args);
    enqueue('ERROR', args);
  };

  console.log('[discord-logger] Discord logging enabled.');
}
