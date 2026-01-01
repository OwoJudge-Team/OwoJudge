import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Submission } from '../mongoose/schemas/submission';
import { PlagiarismReport } from '../mongoose/schemas/plagiarism-report';
import { SubmissionStatus } from './submission-status';

const execAsync = promisify(exec);

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const LANGUAGE_EXTENSIONS: { [key: string]: string } = {
  'gcc c17': '.c',
  'gcc c23': '.c',
  'g++ c++17': '.cpp',
  'g++ c++23': '.cpp',
  'rust': '.rs',
  'nodejs': '.js',
  'python3': '.py',
  'bash': '.sh',
};

export class DolosManager {
  private static imageBuilt = false;

  private static async ensureDockerImage() {
    if (this.imageBuilt) return;
    
    try {
      await execAsync('docker image inspect dolos-service');
      this.imageBuilt = true;
    } catch (e) {
      console.log('Building dolos-service docker image...');
      // Assuming the Dockerfile is in backend/dolos-service
      // We need to find the absolute path.
      // __dirname is backend/src/utils
      const dockerDir = path.resolve(__dirname, '../../dolos-service');
      
      // Check if directory exists
      if (!fs.existsSync(dockerDir)) {
          throw new Error(`Dolos service directory not found at ${dockerDir}`);
      }

      await execAsync(`cd "${dockerDir}" && docker build -t dolos-service .`);
      this.imageBuilt = true;
    }
  }

  static async checkPlagiarism(problemSerialNumber: number) {
    await this.ensureDockerImage();

    // 1. Get the latest submission time for this problem
    const latestSubmission = await Submission.findOne(
      { problemSerialNumber },
      { createdTime: 1 },
      { sort: { createdTime: -1 } }
    );

    if (!latestSubmission) {
      return null; // No submissions
    }

    // 2. Check for cached report
    const cachedReport = await PlagiarismReport.findOne({ problemSerialNumber });

    if (cachedReport) {
      const isCacheFresh = cachedReport.lastSubmissionTime.getTime() >= latestSubmission.createdTime.getTime();
      const isWithinThrottle = (Date.now() - cachedReport.createdAt.getTime()) < CACHE_TTL;

      // If we have the latest data OR we are within the throttle period, return cached result
      if (isCacheFresh || isWithinThrottle) {
        return cachedReport.result;
      }
    }

    // 3. Fetch all submissions
    // We fetch AC submissions to reduce noise, but maybe user wants all.
    // Let's fetch all that are not compilation error.
    const submissions = await Submission.find({ 
        problemSerialNumber,
        status: { $ne: SubmissionStatus.CompilationError }
    }).select('userSolution language _id userHandle serialNumber');

    if (submissions.length < 2) {
        return [];
    }

    // 4. Prepare files
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dolos-'));
    const inputDir = path.join(tmpDir, 'input');
    fs.mkdirSync(inputDir);

    const fileMap = new Map<string, any>(); // Map filename to submission info

    for (const sub of submissions) {
        const ext = LANGUAGE_EXTENSIONS[sub.language] || '.txt';
        // Use _id for filename to avoid collisions and special chars
        const filename = `${sub._id}${ext}`;
        
        // Concatenate all files in the submission
        const content = sub.userSolution.map((s: any) => `// File: ${s.filename}\n${s.content}`).join('\n\n');
        
        fs.writeFileSync(path.join(inputDir, filename), content);
        fileMap.set(filename, {
            id: sub._id,
            serialNumber: sub.serialNumber,
            author: sub.userHandle,
            language: sub.language
        });
    }

    try {
        // 5. Run Dolos
        // Mount inputDir to /input
        // Pass /input/* to the command
        
        const cmd = `docker run --rm -v "${inputDir}:/input" dolos-service /input/*`;
        
        // Increase max buffer for large output (50MB)
        const { stdout } = await execAsync(cmd, { maxBuffer: 1024 * 1024 * 50 }); 
        
        const rawResults = JSON.parse(stdout);

        // 6. Process results
        const processedResults = rawResults.map((pair: any) => {
            const leftFilename = path.basename(pair.leftFile);
            const rightFilename = path.basename(pair.rightFile);
            
            const leftInfo = fileMap.get(leftFilename);
            const rightInfo = fileMap.get(rightFilename);

            return {
                left: {
                    id: leftInfo?.id,
                    serialNumber: leftInfo?.serialNumber,
                    author: leftInfo?.author,
                    file: leftFilename
                },
                right: {
                    id: rightInfo?.id,
                    serialNumber: rightInfo?.serialNumber,
                    author: rightInfo?.author,
                    file: rightFilename
                },
                similarity: pair.similarity,
                totalOverlap: pair.totalOverlap,
                fragments: pair.fragments
            };
        });

        // Sort by similarity
        processedResults.sort((a: any, b: any) => b.similarity - a.similarity);

        // 7. Save to DB
        await PlagiarismReport.findOneAndUpdate(
            { problemSerialNumber },
            {
                lastSubmissionTime: latestSubmission.createdTime,
                createdAt: new Date(),
                result: processedResults
            },
            { upsert: true }
        );

        return processedResults;

    } catch (error) {
        console.error('Dolos execution failed:', error);
        throw error;
    } finally {
        // Cleanup
        fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }
}
