import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';

const execAsync = promisify(exec);

export interface IsolateConfig {
  processes?: number;
  timeLimit?: number;
  wallTimeLimit?: number;
  memoryLimit?: number;
  stdin?: string;
  stdout?: string;
  stderr?: string;
  metaFile?: string;
  fullEnv?: boolean;
  dirs?: string[];
  cwd?: string;
}

export class IsolateManager {
  private static usedBoxIDs = new Set<number>();
  private static boxLocks = new Map<number, boolean>();
  private static boxIDCounter = 0;
  private static boxIDMutex = false;
  private static readonly BOX_ID_RANGE_START = 0;
  private static readonly BOX_ID_RANGE_END = 500;

  private boxID: number | null = null;
  private boxDir: string | null = null;
  private locked: boolean = false;

  /**
   * Sleep utility for mutex waiting
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Acquire file-based lock for a box
   */
  private static async acquireBoxLock(boxID: number): Promise<void> {
    const lockFile = `/tmp/judge-box-${boxID}.lock`;
    let attempts = 0;

    while (attempts < 100) {
      try {
        fs.writeFileSync(lockFile, process.pid.toString(), { flag: 'wx' });
        return;
      } catch (error: any) {
        if (error.code === 'EEXIST') {
          try {
            const pidStr = fs.readFileSync(lockFile, 'utf-8');
            const pid = parseInt(pidStr);
            process.kill(pid, 0);
            await IsolateManager.sleep(100);
            attempts++;
          } catch {
            try {
              fs.unlinkSync(lockFile);
            } catch {}
          }
        } else {
          throw error;
        }
      }
    }

    throw new Error(`Failed to acquire lock for box ${boxID} after ${attempts} attempts`);
  }

  /**
   * Release file-based lock for a box
   */
  private static releaseBoxLock(boxID: number): void {
    const lockFile = `/tmp/judge-box-${boxID}.lock`;
    try {
      fs.unlinkSync(lockFile);
    } catch (error) {
      console.warn(`Failed to release lock file for box ${boxID}:`, error);
    }
  }

  /**
   * Get next available box ID with atomic protection
   */
  private static async getNextBoxID(): Promise<number> {
    while (IsolateManager.boxIDMutex) {
      await IsolateManager.sleep(Math.random() * 2 + 0.5);
    }
    IsolateManager.boxIDMutex = true;

    try {
      let boxID: number;
      let attempts = 0;

      do {
        boxID = IsolateManager.boxIDCounter;
        IsolateManager.boxIDCounter = (IsolateManager.boxIDCounter + 1) % IsolateManager.BOX_ID_RANGE_END;
        attempts++;

        if (attempts > IsolateManager.BOX_ID_RANGE_END) {
          console.warn('All box IDs exhausted, forcing cleanup');
          IsolateManager.usedBoxIDs.clear();
          IsolateManager.boxLocks.clear();
          IsolateManager.boxIDCounter = Math.floor(Math.random() * 100);
          boxID = IsolateManager.boxIDCounter;
          break;
        }
      } while (IsolateManager.usedBoxIDs.has(boxID) || IsolateManager.boxLocks.get(boxID));

      IsolateManager.usedBoxIDs.add(boxID);
      IsolateManager.boxLocks.set(boxID, true);
      return boxID;
    } finally {
      IsolateManager.boxIDMutex = false;
    }
  }

  /**
   * Release a box ID
   */
  private static async releaseBoxID(boxID: number): Promise<void> {
    while (IsolateManager.boxIDMutex) {
      await IsolateManager.sleep(Math.random() * 2 + 0.5);
    }
    IsolateManager.boxIDMutex = true;

    try {
      IsolateManager.usedBoxIDs.delete(boxID);
      IsolateManager.boxLocks.delete(boxID);
    } finally {
      IsolateManager.boxIDMutex = false;
    }
  }

  /**
   * Initialize a new isolate box
   */
  async init(): Promise<string> {
    if (this.boxID !== null) {
      throw new Error('Box already initialized');
    }

    this.boxID = await IsolateManager.getNextBoxID();
    await IsolateManager.acquireBoxLock(this.boxID);
    this.locked = true;

    const { stdout: boxPath } = await execAsync(`isolate --box-id=${this.boxID} --cg --wait --init`);
    this.boxDir = boxPath.trim() + '/box';

    return this.boxDir;
  }

  /**
   * Get the box directory path
   */
  getBoxDir(): string {
    if (!this.boxDir) {
      throw new Error('Box not initialized');
    }
    return this.boxDir;
  }

  /**
   * Get the box ID
   */
  getBoxID(): number {
    if (this.boxID === null) {
      throw new Error('Box not initialized');
    }
    return this.boxID;
  }

  /**
   * Copy files to the box
   */
  async copyToBox(sourcePath: string, destPath: string = ''): Promise<void> {
    if (!this.boxDir) {
      throw new Error('Box not initialized');
    }

    const targetPath = destPath ? `${this.boxDir}/${destPath}` : `${this.boxDir}/`;
    await execAsync(`cp -r ${sourcePath} ${targetPath}`);
  }

  /**
   * Copy files from the box
   */
  async copyFromBox(sourcePath: string, destPath: string): Promise<void> {
    if (!this.boxDir) {
      throw new Error('Box not initialized');
    }

    const boxSourcePath = `${this.boxDir}/${sourcePath}`;
    await execAsync(`cp -r ${boxSourcePath} ${destPath}`);
  }

  /**
   * Run a command in the isolate box
   */
  async run(command: string, config: IsolateConfig = {}, timeout?: number): Promise<{ stdout: string; stderr: string }> {
    if (this.boxID === null) {
      throw new Error('Box not initialized');
    }

    const {
      processes = 1,
      timeLimit = 10,
      wallTimeLimit = 20,
      memoryLimit = 512000,
      stdin,
      stdout,
      stderr,
      metaFile,
      fullEnv = false,
      dirs = [],
      cwd
    } = config;

    let isolateCommand = `isolate --box-id=${this.boxID} --cg --wait `;
    isolateCommand += `--processes=${processes} `;
    isolateCommand += `--time=${timeLimit} `;
    isolateCommand += `--wall-time=${wallTimeLimit} `;
    isolateCommand += `--mem=${memoryLimit} `;

    if (metaFile) {
      isolateCommand += `--meta=${metaFile} `;
    }

    if (stdin) {
      isolateCommand += `--stdin=${stdin} `;
    }

    if (stdout) {
      isolateCommand += `--stdout=${stdout} `;
    }

    if (stderr) {
      isolateCommand += `--stderr=${stderr} `;
    }

    if (fullEnv) {
      isolateCommand += `--full-env `;
    }

    for (const dir of dirs) {
      isolateCommand += `--dir=${dir} `;
    }

    const cwdPrefix = cwd ? `cd ${cwd} && ` : '';
    isolateCommand += `--run -- /bin/bash -c "${cwdPrefix}${command}"`;

    return await execAsync(isolateCommand, { timeout });
  }

  /**
   * Cleanup and release the box
   */
  async cleanup(): Promise<void> {
    if (this.boxID === null) {
      return;
    }

    try {
      await execAsync(`isolate --box-id=${this.boxID} --cg --wait --cleanup`);
    } catch (error) {
      console.warn(`Failed to cleanup box ${this.boxID}:`, error);
    } finally {
      if (this.locked) {
        IsolateManager.releaseBoxLock(this.boxID);
        this.locked = false;
      }
      await IsolateManager.releaseBoxID(this.boxID);
      this.boxID = null;
      this.boxDir = null;
    }
  }

  /**
   * Execute a function with automatic cleanup
   */
  static async withBox<T>(fn: (manager: IsolateManager) => Promise<T>): Promise<T> {
    const manager = new IsolateManager();
    try {
      await manager.init();
      return await fn(manager);
    } finally {
      await manager.cleanup();
    }
  }
}
