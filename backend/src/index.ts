import { createApp } from './create-app';
import { Application } from 'express';
import Judger from './judger/judger';

const app: Application = createApp();
const PORT: number | string = process.env.PORT || 8787;

const judger = new Judger();
judger.start(10000);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  judger.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  judger.stop();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Listening to port: ${PORT}`);
});
