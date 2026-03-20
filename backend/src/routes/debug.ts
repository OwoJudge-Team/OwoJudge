import { Router } from 'express';
import { getDiscordLoggerStatus, forceFlush } from '../utils/discord-logger';
import { isJudgeAdmin } from '../middleware/auth';

const debugRouter: Router = Router();

debugRouter.get('/api/debug/discord', isJudgeAdmin, async (_req, res) => {
  const before = getDiscordLoggerStatus();

  // Enqueue a test message — if enqueue is broken, queueLength won't grow
  console.log('[debug] Test message from /api/debug/discord');

  const afterEnqueue = getDiscordLoggerStatus();

  // Force-flush so we don't have to wait for the background timer
  const flushResult = await forceFlush();

  const afterFlush = getDiscordLoggerStatus();

  res.json({ before, afterEnqueue, flushResult, afterFlush });
});

export default debugRouter;
