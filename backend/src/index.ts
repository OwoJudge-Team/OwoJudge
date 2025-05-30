import { createApp } from './create-app';
import { Application } from 'express';
import Judger from './judger/judger';

const app: Application = createApp();
const PORT: number | string = process.env.PORT || 8787;

// Initialize and start the judger
const judger = new Judger();
judger.start(10000); // Check for pending submissions every 10 seconds

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
