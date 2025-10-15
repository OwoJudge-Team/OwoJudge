import { Submission, ISubmission } from '../mongoose/schemas/submission';
import { SubmissionStatus } from '../utils/submission-status';
import { Worker } from 'worker_threads';
import * as path from 'path';
import * as os from 'os';
import mongoose from 'mongoose';

interface WorkerMessage {
  type: 'process_submission';
  submissionID: string;
}

interface WorkerResponse {
  type: 'submission_complete' | 'worker_ready' | 'error';
  submissionID?: string;
  error?: string;
}

class JudgerManager {
  private workers: Worker[] = [];
  private availableWorkers: Worker[] = [];
  private submissionQueue: string[] = [];
  private isShuttingDown = false;
  private workerCount: number;
  private pollInterval: NodeJS.Timeout | null = null;

  constructor(numWorkers: number = os.cpus().length - 1) {
    this.workers = [];
    this.availableWorkers = [];
    this.submissionQueue = [];
    this.workerCount = Math.max(1, numWorkers); // Ensure at least 1 worker
    
    const workerData = {
      mongoUri: process.env.MONGO_URI || 'mongodb://mongodb:27017/judge'
    };
    
    for (let i = 0; i < this.workerCount; i++) {
      // Use compiled JavaScript files for Workers
      const worker = new Worker(path.join(__dirname, 'judger-worker.js'), {
        workerData
      });
      worker.on('message', (response: WorkerResponse) => {
        this.handleWorkerMessage(worker, response);
      });
      worker.on('error', () => this.handleWorkerError(worker));
      worker.on('exit', this.handleWorkerExit.bind(this));
      this.workers.push(worker);
      this.availableWorkers.push(worker);
    }
  }

  async initialize(): Promise<void> {
    console.log(`Initializing judger with ${this.workerCount} workers...`);
    
    // Workers are already created in the constructor
    // Start polling for new submissions
    this.startPolling();
    console.log('Judger manager initialized successfully');
  }

  private async createWorker(): Promise<Worker> {
    // Use compiled JavaScript files for Workers
    const workerData = {
      mongoUri: process.env.MONGO_URI || 'mongodb://mongodb:27017/judge'
    };
    
    const worker = new Worker(path.join(__dirname, 'judger-worker.js'), {
      workerData
    });

    worker.on('message', (response: WorkerResponse) => {
      this.handleWorkerMessage(worker, response);
    });
    worker.on('error', () => this.handleWorkerError(worker));
    worker.on('exit', this.handleWorkerExit.bind(this));

    this.workers.push(worker);
    this.availableWorkers.push(worker);
    return worker;
  }

  private handleWorkerMessage(worker: Worker, response: WorkerResponse): void {
    switch (response.type) {
      case 'worker_ready':
        if (!this.availableWorkers.includes(worker)) {
          this.availableWorkers.push(worker);
        }
        this.processNextSubmission();
        break;

      case 'submission_complete':
        console.log(`Submission ${response.submissionID} completed successfully`);
        if (!this.availableWorkers.includes(worker)) {
          this.availableWorkers.push(worker);
        }
        this.processNextSubmission();
        break;

      case 'error':
        console.error(`Worker error for submission ${response.submissionID}:`, response.error);
        if (!this.availableWorkers.includes(worker)) {
          this.availableWorkers.push(worker);
        }
        this.processNextSubmission();
        break;
    }
  }

  private async handleWorkerError(worker: Worker): Promise<void> {
    // Remove worker from available workers
    this.availableWorkers = this.availableWorkers.filter(w => w !== worker);
    
    // Remove worker from workers array
    const workerIndex = this.workers.indexOf(worker);
    if (workerIndex !== -1) {
      this.workers.splice(workerIndex, 1);
    }

    // Create a new worker to replace the failed one if not shutting down
    if (!this.isShuttingDown) {
      try {
        await this.createWorker();
        console.log('Replaced failed worker');
      } catch (error) {
        console.error('Failed to create replacement worker:', error);
      }
    }
  }

  private handleWorkerExit(code: number): void {
    console.log(`Worker exited with code ${code}`);
    // Worker cleanup is handled by handleWorkerError which is also called on exit
  }

  private processNextSubmission(): void {
    if (this.submissionQueue.length > 0 && this.availableWorkers.length > 0) {
      const submissionID = this.submissionQueue.shift()!;
      const worker = this.availableWorkers.shift()!;

      const message: WorkerMessage = {
        type: 'process_submission',
        submissionID
      };

      worker.postMessage(message);
    }
  }

  private startPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }

    this.pollInterval = setInterval(async () => {
      if (this.isShuttingDown) {
        return;
      }

      try {
        // Find submissions that are pending and not already in queue
        const pendingSubmissions = await Submission.find({
          status: SubmissionStatus.PD
        }).sort({ createdTime: 1 }); // FIFO

        for (const submission of pendingSubmissions) {
          const submissionID = (submission._id as any).toString();
          
          // Check if already in queue
          if (!this.submissionQueue.includes(submissionID)) {
            // Mark as queued to prevent race conditions
            submission.status = SubmissionStatus.QU;
            await submission.save();
            
            // Add to queue
            this.submissionQueue.push(submissionID);
            console.log(`Added submission ${submissionID} to queue`);
          }
        }

        // Process submissions if workers are available
        this.processNextSubmission();

      } catch (error) {
        console.error('Error polling for submissions:', error);
      }
    }, 1000); // Poll every second
  }

  async submitSubmission(submission: ISubmission): Promise<void> {
    const submissionID = (submission._id as any).toString();
    
    // Update status to queued
    submission.status = SubmissionStatus.QU;
    await submission.save();

    // Add to queue if not already present
    if (!this.submissionQueue.includes(submissionID)) {
      this.submissionQueue.push(submissionID);
      console.log(`Manually added submission ${submissionID} to queue`);
    }

    // Try to process immediately if workers are available
    this.processNextSubmission();
  }

  async shutdown(): Promise<void> {
    console.log('Shutting down judger manager...');
    this.isShuttingDown = true;

    // Stop polling
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    // Reset queued submissions back to pending
    for (const submissionID of this.submissionQueue) {
      try {
        const submission = await Submission.findById(submissionID);
        if (submission && submission.status === SubmissionStatus.QU) {
          submission.status = SubmissionStatus.PD;
          await submission.save();
        }
      } catch (error) {
        console.error(`Error resetting submission ${submissionID} status:`, error);
      }
    }

    // Terminate all workers
    const terminationPromises = this.workers.map(worker => 
      new Promise<void>((resolve) => {
        worker.terminate().then(() => resolve()).catch(() => resolve());
      })
    );

    await Promise.all(terminationPromises);

    this.workers = [];
    this.availableWorkers = [];
    this.submissionQueue = [];

    console.log('Judger manager shut down successfully');
  }

  getQueueStatus(): { queueLength: number; availableWorkers: number; totalWorkers: number } {
    return {
      queueLength: this.submissionQueue.length,
      availableWorkers: this.availableWorkers.length,
      totalWorkers: this.workers.length
    };
  }
}

// Singleton instance
let judgerManager: JudgerManager | null = null;

export const setupWorker = async (numWorkers?: number): Promise<void> => {
  if (judgerManager) {
    await judgerManager.shutdown();
  }

  judgerManager = new JudgerManager(numWorkers);
  await judgerManager.initialize();
};

export const submitUserSubmission = async (submission: ISubmission): Promise<void> => {
  if (!judgerManager) {
    throw new Error('Judger manager not initialized. Call setupWorker first.');
  }

  await judgerManager.submitSubmission(submission);
};

export const shutdownJudger = async (): Promise<void> => {
  if (judgerManager) {
    await judgerManager.shutdown();
    judgerManager = null;
  }
};

export const getJudgerStatus = (): { queueLength: number; availableWorkers: number; totalWorkers: number; cpuCores: number } | null => {
  if (!judgerManager) return null;
  
  const status = judgerManager.getQueueStatus();
  return {
    ...status,
    cpuCores: os.cpus().length
  };
};
