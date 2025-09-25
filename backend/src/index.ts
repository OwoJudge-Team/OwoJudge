import { createApp } from './create-app';
import { Application } from 'express';
import { setupWorker, shutdownJudger } from './judger/judger';

const app: Application = createApp();
const PORT: number | string = process.env.PORT || 8787;

setupWorker(4);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  await shutdownJudger();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  await shutdownJudger();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Listening to port: ${PORT}`);
});
