import { Router } from 'express';
import { getDiscordLoggerStatus } from '../utils/discord-logger';
import { isJudgeAdmin } from '../middleware/auth';

const debugRouter: Router = Router();

debugRouter.get('/api/debug/discord', isJudgeAdmin, (_req, res) => {
  const status = getDiscordLoggerStatus();
  console.log('[debug] Discord logger status check triggered via /api/debug/discord');
  res.json(status);
});

export default debugRouter;
