import { Submission, ISubmission } from '../mongoose/schemas/submission';
import { Problem, IProblem } from '../mongoose/schemas/problems';
import languageSupport from '../utils/language-support';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface JudgeResult {
  status: string;
  time: number;
  memory: number;
  exitCode?: number;
  message?: string;
}

class Judger {
  private isJudging = false;
  private judgeInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    console.log('Judger initialized');
  }

  /**
   * Start the judger to poll for pending submissions
   */
  public start(intervalMs: number = 5000): void {
    if (this.judgeInterval) {
      console.log('Judger is already running');
      return;
    }

    console.log(`Starting judger with ${intervalMs}ms interval`);
    this.judgeInterval = setInterval(async () => {
      if (!this.isJudging) {
        await this.processPendingSubmissions();
      }
    }, intervalMs);
  }

  /**
   * Stop the judger
   */
  public stop(): void {
    if (this.judgeInterval) {
      clearInterval(this.judgeInterval);
      this.judgeInterval = null;
      console.log('Judger stopped');
    }
  }

  /**
   * Process all pending submissions
   */
  private async processPendingSubmissions(): Promise<void> {
    try {
      this.isJudging = true;
      
      // Find all pending submissions
      const pendingSubmissions = await Submission.find({ status: 'pending' })
        .sort({ createdTime: 1 })
        .limit(5); // Process max 5 at a time

      if (pendingSubmissions.length === 0) {
        this.isJudging = false;
        return;
      }

      console.log(`Found ${pendingSubmissions.length} pending submission(s)`);

      for (const submission of pendingSubmissions) {
        try {
          await this.judgeSubmission(submission);
        } catch (error) {
          console.error(`Error judging submission ${submission._id}:`, error);
          // Mark as system error
          submission.status = 'System Error';
          submission.result = {
            score: 0,
            maxTime: 0,
            maxMemory: 0,
            individual: []
          };
          await submission.save();
        }
      }
    } catch (error) {
      console.error('Error processing pending submissions:', error);
    } finally {
      this.isJudging = false;
    }
  }

  /**
   * Judge a single submission
   */
  private async judgeSubmission(submission: ISubmission): Promise<void> {
    console.log(`Judging submission ${submission._id} for problem ${submission.problemID}`);

    // Update status to judging
    submission.status = 'Judging';
    await submission.save();

    try {
      // Get problem details
      const problem = await Problem.findOne({ displayID: submission.problemID });
      if (!problem) {
        throw new Error(`Problem ${submission.problemID} not found`);
      }

      // Check language support
      if (!languageSupport[submission.language as keyof typeof languageSupport]) {
        throw new Error(`Language ${submission.language} is not supported`);
      }

      const langConfig = languageSupport[submission.language as keyof typeof languageSupport];

      // Create working directory for this submission
      const workDir = `/tmp/judge_${submission._id}`;
      const userSolutionDir = path.join(workDir, 'user-solutions');
      const testDataDir = path.join(workDir, 'testdata');

      // Clean up and create directories
      await this.setupWorkingDirectory(workDir, userSolutionDir, testDataDir);

      // Write user solution files
      for (const file of submission.userSolution) {
        const filePath = path.join(userSolutionDir, file.filename);
        fs.writeFileSync(filePath, file.content);
      }

      // Compile if needed
      if (langConfig.compileCommand) {
        await this.compileUserSolution(workDir, langConfig.compileCommand);
      }

      // Copy test data
      await this.copyTestData(submission.problemID, testDataDir);

      // Run test cases
      const testResults = await this.runTestCases(
        workDir,
        userSolutionDir,
        testDataDir,
        problem,
        langConfig.executeCommand
      );

      // Calculate final score and status
      const finalResult = this.calculateFinalResult(testResults, problem);

      // Update submission with results
      submission.status = finalResult.status;
      submission.result = {
        score: finalResult.score,
        maxTime: finalResult.maxTime,
        maxMemory: finalResult.maxMemory,
        individual: testResults
      };

      await submission.save();

      // Clean up
      await this.cleanupWorkingDirectory(workDir);

      console.log(`Submission ${submission._id} judged: ${finalResult.status} (${finalResult.score} points)`);

    } catch (error) {
      console.error(`Error judging submission ${submission._id}:`, error);
      submission.status = 'System Error';
      submission.result = {
        score: 0,
        maxTime: 0,
        maxMemory: 0,
        individual: []
      };
      await submission.save();
    }
  }

  /**
   * Setup working directory structure
   */
  private async setupWorkingDirectory(workDir: string, userSolutionDir: string, testDataDir: string): Promise<void> {
    // Remove existing directory if it exists
    if (fs.existsSync(workDir)) {
      fs.rmSync(workDir, { recursive: true, force: true });
    }

    // Create directories
    fs.mkdirSync(workDir, { recursive: true });
    fs.mkdirSync(userSolutionDir, { recursive: true });
    fs.mkdirSync(testDataDir, { recursive: true });
  }

  /**
   * Compile user solution using isolate
   */
  private async compileUserSolution(workDir: string, compileCommand: string): Promise<void> {
    const boxId = Math.floor(Math.random() * 500); // Use 0-499 range for compilation
    const userSolutionDir = path.join(workDir, 'user-solutions');
    
    try {
      // Initialize isolate box for compilation
      await execAsync(`isolate --box-id=${boxId} --cleanup`);
      const { stdout: boxPath } = await execAsync(`isolate --box-id=${boxId} --init`);
      
      // Get box directory - isolate returns the path directly from init
      const boxDir = path.join(boxPath.trim(), 'box');

      // Copy source files to isolate box
      const sourceFiles = fs.readdirSync(userSolutionDir);
      for (const file of sourceFiles) {
        const srcPath = path.join(userSolutionDir, file);
        const destPath = path.join(boxDir, file);
        fs.copyFileSync(srcPath, destPath);
      }

      // Create compilation output files in the working directory
      const compileErrorFile = path.join(workDir, `compile_error_${boxId}.txt`);
      const metaFile = path.join(workDir, `compile_meta_${boxId}.txt`);

      // Prepare isolate compilation command
      // Remove the path prefix from the compile command since we're in the box
      const boxCompileCommand = compileCommand
        .replace('./user-solutions/', './')
        .replace(/user-solutions\//g, '');

      const isolateCommand = `isolate --box-id=${boxId} ` +
        `--time=30 ` + // 30 seconds for compilation
        `--mem=512000 ` + // 512MB for compilation
        `--meta=${metaFile} ` +
        `--stderr=${compileErrorFile} ` +
        `--full-env ` + // Allow full environment for compilation
        `--run -- /bin/bash -c "${boxCompileCommand}"`;

      console.log('Running compilation command:', isolateCommand);

      try {
        const { stdout, stderr } = await execAsync(isolateCommand, { 
          timeout: 35000 // 35 seconds total timeout
        });

        // Copy compiled executable back if it exists
        const executablePath = path.join(boxDir, 'main');
        const targetPath = path.join(userSolutionDir, 'main');
        
        if (fs.existsSync(executablePath)) {
          fs.copyFileSync(executablePath, targetPath);
          fs.chmodSync(targetPath, 0o755);
          console.log('Compilation successful, executable copied');
        }

        // Check for compilation warnings/errors
        if (fs.existsSync(compileErrorFile)) {
          const compileOutput = fs.readFileSync(compileErrorFile, 'utf8');
          if (compileOutput.trim()) {
            console.log('Compile output:', compileOutput);
          }
        }

      } catch (error: any) {
        // Read compilation error if available
        let errorMessage = error.message;
        if (fs.existsSync(compileErrorFile)) {
          const compileError = fs.readFileSync(compileErrorFile, 'utf8');
          if (compileError.trim()) {
            errorMessage = compileError;
          }
        }

        // Read meta file to check if it was a timeout or memory issue
        if (fs.existsSync(metaFile)) {
          const metaContent = fs.readFileSync(metaFile, 'utf8');
          if (metaContent.includes('status:TO')) {
            errorMessage = 'Compilation timeout (exceeded 30 seconds)';
          } else if (metaContent.includes('status:MLE')) {
            errorMessage = 'Compilation memory limit exceeded';
          }
        }

        console.error('Compilation failed:', errorMessage);
        throw new Error(`Compilation Error: ${errorMessage}`);
      }

    } catch (error: any) {
      if (error.message.startsWith('Compilation Error:')) {
        throw error; // Re-throw compilation errors as-is
      }
      console.error('Compilation system error:', error);
      throw new Error(`Compilation System Error: ${error.message}`);
    } finally {
      // Cleanup isolate box
      try {
        await execAsync(`isolate --box-id=${boxId} --cleanup`);
      } catch (error) {
        console.warn('Failed to cleanup compilation isolate box:', error);
      }
    }
  }

  /**
   * Copy test data for the problem
   */
  private async copyTestData(problemID: string, testDataDir: string): Promise<void> {
    const problemDir = path.join(process.cwd(), 'problems', problemID);
    const testsDir = path.join(problemDir, 'tests');
    
    if (!fs.existsSync(problemDir)) {
      throw new Error(`Test data directory not found for problem ${problemID}`);
    }

    let testFilesCopied = 0;

    // Check if tests subdirectory exists
    if (fs.existsSync(testsDir)) {
      console.log(`Looking for test cases in: ${testsDir}`);
      // Copy test files from tests subdirectory
      const testFiles = fs.readdirSync(testsDir);
      const relevantFiles = testFiles.filter(f => f.endsWith('.in') || f.endsWith('.out'));
      
      for (const file of relevantFiles) {
        const srcPath = path.join(testsDir, file);
        const destPath = path.join(testDataDir, file);
        fs.copyFileSync(srcPath, destPath);
        testFilesCopied++;
      }
      console.log(`Copied ${testFilesCopied} test files from tests directory`);
      
      // Log the test case pairs found
      const inputFiles = relevantFiles.filter(f => f.endsWith('.in'));
      const outputFiles = relevantFiles.filter(f => f.endsWith('.out'));
      console.log(`Found ${inputFiles.length} input files and ${outputFiles.length} output files`);
    } else {
      console.log(`Tests directory not found, checking problem root: ${problemDir}`);
      // Fallback: look for test files in problem directory
      const files = fs.readdirSync(problemDir);
      const testFiles = files.filter(f => f.endsWith('.in') || f.endsWith('.out'));
      
      for (const file of testFiles) {
        const srcPath = path.join(problemDir, file);
        const destPath = path.join(testDataDir, file);
        if (fs.lstatSync(srcPath).isFile()) {
          fs.copyFileSync(srcPath, destPath);
          testFilesCopied++;
        }
      }
      console.log(`Copied ${testFilesCopied} test files from problem directory (fallback)`);
    }

    if (testFilesCopied === 0) {
      console.warn(`No test case files (.in/.out) found for problem ${problemID}`);
    }
  }

  /**
   * Run test cases using isolate
   */
  private async runTestCases(
    workDir: string,
    userSolutionDir: string,
    testDataDir: string,
    problem: IProblem,
    executeCommand: string
  ): Promise<JudgeResult[]> {
    const results: JudgeResult[] = [];
    
    // Look for input and output files in test data directory
    const testFiles = fs.readdirSync(testDataDir);
    console.log(`Found ${testFiles.length} files in test data directory:`, testFiles);
    
    const inputFiles = testFiles.filter(f => f.endsWith('.in'));
    const outputFiles = testFiles.filter(f => f.endsWith('.out'));
    
    console.log(`Test files analysis: ${inputFiles.length} .in files, ${outputFiles.length} .out files`);
    
    if (inputFiles.length === 0 && outputFiles.length === 0) {
      console.log('No test case files found, creating demo test case');
      // Create a dummy test case for demo (A + B problem)
      const inputPath = path.join(testDataDir, 'demo_input.txt');
      const outputPath = path.join(testDataDir, 'demo_output.txt');
      fs.writeFileSync(inputPath, '1 2\n');
      fs.writeFileSync(outputPath, '3\n');
      
      const result = await this.runSingleTestCase(
        workDir,
        userSolutionDir,
        inputPath,
        outputPath,
        problem.timeLimit,
        problem.memoryLimit,
        executeCommand
      );
      results.push(result);
    } else {
      // Run actual test cases with proper input/output pairing
      const testCasePairs = this.matchTestCaseFiles(testFiles);
      
      if (testCasePairs.length > 0) {
        console.log(`Running ${testCasePairs.length} test cases`);
        
        for (let i = 0; i < testCasePairs.length; i++) {
          const pair = testCasePairs[i];
          console.log(`Running test case ${i + 1}/${testCasePairs.length}: ${pair.input} -> ${pair.output}`);
          
          const inputFile = path.join(testDataDir, pair.input);
          const outputFile = path.join(testDataDir, pair.output);
          
          const result = await this.runSingleTestCase(
            workDir,
            userSolutionDir,
            inputFile,
            outputFile,
            problem.timeLimit,
            problem.memoryLimit,
            executeCommand
          );
          results.push(result);
          
          console.log(`Test case ${i + 1} result: ${result.status} (${result.time}ms, ${result.memory}KB)`);
        }
      } else if (inputFiles.length > 0 || outputFiles.length > 0) {
        console.warn('Found test files but could not match input/output pairs properly');
        
        if (inputFiles.length > 0 && outputFiles.length > 0) {
          // Fallback: assume first input and first output match
          console.log('Using fallback: matching first input with first output file');
          const inputFile = path.join(testDataDir, inputFiles[0]);
          const outputFile = path.join(testDataDir, outputFiles[0]);
          
          const result = await this.runSingleTestCase(
            workDir,
            userSolutionDir,
            inputFile,
            outputFile,
            problem.timeLimit,
            problem.memoryLimit,
            executeCommand
          );
          results.push(result);
        } else {
          // Create basic test case if only inputs or only outputs exist
          console.warn('Incomplete test case files found, creating basic test case');
          const inputPath = path.join(testDataDir, 'generated_input.txt');
          const outputPath = path.join(testDataDir, 'generated_output.txt');
          
          // Generate a simple test case (A + B)
          fs.writeFileSync(inputPath, '1 2\n');
          fs.writeFileSync(outputPath, '3\n');
          
          const result = await this.runSingleTestCase(
            workDir,
            userSolutionDir,
            inputPath,
            outputPath,
            problem.timeLimit,
            problem.memoryLimit,
            executeCommand
          );
          results.push(result);
        }
      }
    }

    console.log(`Completed ${results.length} test cases`);
    return results;
  }

  /**
   * Run a single test case using isolate
   */
  private async runSingleTestCase(
    workDir: string,
    userSolutionDir: string,
    inputFile: string,
    expectedOutputFile: string,
    timeLimit: number,
    memoryLimit: number,
    executeCommand: string
  ): Promise<JudgeResult> {
    const boxId = Math.floor(Math.random() * 500) + 500; // Use 500-999 range for execution
    const outputFile = path.join(workDir, 'user_output.txt');

    try {
      // Initialize isolate box
      await execAsync(`isolate --box-id=${boxId} --cleanup`);
      const { stdout: boxPath } = await execAsync(`isolate --box-id=${boxId} --init`);

      // Get box directory - isolate returns the path directly from init  
      const boxDir = path.join(boxPath.trim(), 'box');

      // Copy executable to box
      if (fs.existsSync(path.join(userSolutionDir, 'main'))) {
        const targetPath = path.join(boxDir, 'main');
        fs.copyFileSync(path.join(userSolutionDir, 'main'), targetPath);
        fs.chmodSync(targetPath, 0o755);
        console.log('Executable copied to isolate box');
      }

      // Copy source files if no compilation was needed (for interpreted languages)
      const sourceFiles = fs.readdirSync(userSolutionDir);
      for (const file of sourceFiles) {
        if (file !== 'main') {
          const srcPath = path.join(userSolutionDir, file);
          const destPath = path.join(boxDir, file);
          if (fs.existsSync(srcPath)) {
            fs.copyFileSync(srcPath, destPath);
          }
        }
      }

      // Run the program  
      const metaFile = path.join(workDir, `meta_${boxId}.txt`);
      const stderrFile = path.join(workDir, `stderr_${boxId}.txt`);
      
      // Convert time limit from ms to seconds for isolate
      const timeLimitSeconds = Math.ceil(timeLimit / 1000);
      
      const command = `isolate --box-id=${boxId} ` +
        `--time=${timeLimitSeconds} ` +
        `--mem=${memoryLimit} ` +
        `--meta=${metaFile} ` +
        `--stdin=${inputFile} ` +
        `--stdout=${outputFile} ` +
        `--stderr=${stderrFile} ` +
        `--run -- ${executeCommand}`;

      console.log('Running test case with command:', command);

      const startTime = Date.now();
      
      try {
        await execAsync(command, { timeout: (timeLimit + 5000) });
      } catch (error: any) {
        // Isolate returns non-zero exit code for various reasons
        // We'll check the meta file to determine the actual status
        console.log('Isolate execution completed with exit code (this is normal)');
      }

      const runTime = Date.now() - startTime;

      // Read meta file to get execution statistics
      let execTime = 0;
      let execMemory = 0;
      let status = 'Unknown';

      if (fs.existsSync(metaFile)) {
        const metaContent = fs.readFileSync(metaFile, 'utf8');
        const metaLines = metaContent.split('\n');
        
        console.log('Meta file content:', metaContent);
        
        for (const line of metaLines) {
          if (line.startsWith('time:')) {
            execTime = parseFloat(line.split(':')[1]) * 1000; // Convert to ms
          } else if (line.startsWith('max-rss:')) {
            execMemory = parseInt(line.split(':')[1]); // KB
          } else if (line.startsWith('status:')) {
            const statusCode = line.split(':')[1];
            status = this.getStatusFromCode(statusCode);
          }
        }
      } else {
        console.warn('Meta file not found');
      }

      // Read stderr for debugging
      if (fs.existsSync(stderrFile)) {
        const stderrContent = fs.readFileSync(stderrFile, 'utf8');
        if (stderrContent.trim()) {
          console.log('Program stderr:', stderrContent);
        }
      }

      // Check if output file exists and compare with expected output
      if (status === 'OK' && fs.existsSync(outputFile)) {
        const userOutput = fs.readFileSync(outputFile, 'utf8').trim();
        const expectedOutput = fs.readFileSync(expectedOutputFile, 'utf8').trim();
        
        console.log('User output:', JSON.stringify(userOutput));
        console.log('Expected output:', JSON.stringify(expectedOutput));
        
        if (userOutput === expectedOutput) {
          status = 'Accepted';
        } else {
          status = 'Wrong Answer';
        }
      } else if (status === 'OK') {
        console.warn('No output file generated');
        status = 'Runtime Error';
      }

      return {
        status,
        time: execTime,
        memory: execMemory
      };

    } catch (error: any) {
      console.error('Error running test case:', error);
      return {
        status: 'System Error',
        time: 0,
        memory: 0,
        message: error.message
      };
    } finally {
      // Cleanup isolate box
      try {
        await execAsync(`isolate --box-id=${boxId} --cleanup`);
      } catch (error) {
        console.warn('Failed to cleanup isolate box:', error);
      }
    }
  }

  /**
   * Convert isolate status code to readable status
   */
  private getStatusFromCode(statusCode: string): string {
    switch (statusCode.trim()) {
      case 'OK': return 'OK';
      case 'RE': return 'Runtime Error';
      case 'TLE': return 'Time Limit Exceeded';
      case 'MLE': return 'Memory Limit Exceeded';
      case 'SG': return 'Runtime Error';
      case 'TO': return 'Time Limit Exceeded';
      case 'XX': return 'System Error';
      default: return 'Unknown';
    }
  }

  /**
   * Calculate final result from individual test results
   */
  private calculateFinalResult(testResults: JudgeResult[], problem: IProblem) {
    let totalScore = 0;
    let maxTime = 0;
    let maxMemory = 0;
    let finalStatus = 'Accepted';

    for (const result of testResults) {
      maxTime = Math.max(maxTime, result.time);
      maxMemory = Math.max(maxMemory, result.memory);

      if (result.status === 'Accepted') {
        totalScore += 100; // Each test case worth 100 points for now
      } else if (finalStatus === 'Accepted') {
        finalStatus = result.status;
      }
    }

    // If all test cases passed, keep status as Accepted
    if (testResults.every(r => r.status === 'Accepted')) {
      finalStatus = 'Accepted';
    }

    return {
      status: finalStatus,
      score: totalScore,
      maxTime,
      maxMemory
    };
  }

  /**
   * Clean up working directory
   */
  private async cleanupWorkingDirectory(workDir: string): Promise<void> {
    try {
      if (fs.existsSync(workDir)) {
        fs.rmSync(workDir, { recursive: true, force: true });
      }
    } catch (error) {
      console.warn('Failed to cleanup working directory:', error);
    }
  }

  /**
   * Match input and output test case files
   */
  /**
   * Match input files (.in) with their corresponding output files (.out)
   * Supports various naming conventions like: 1.in/1.out, test01.in/test01.out, sample.in/sample.out
   */
  private matchTestCaseFiles(testFiles: string[]): Array<{input: string, output: string}> {
    const pairs: Array<{input: string, output: string}> = [];
    const inputFiles = testFiles.filter(f => f.endsWith('.in'));
    const outputFiles = testFiles.filter(f => f.endsWith('.out'));
    
    console.log(`Matching test cases: ${inputFiles.length} input files, ${outputFiles.length} output files`);
    
    for (const inputFile of inputFiles) {
      // Extract the base name (e.g., "1.in" -> "1", "test01.in" -> "test01")
      const baseName = inputFile.replace(/\.in$/, '');
      
      // Look for exact match first (e.g., "1.in" -> "1.out")
      let correspondingOutput = outputFiles.find(f => f === `${baseName}.out`);
      
      // If no exact match, look for files that start with the base name
      if (!correspondingOutput) {
        correspondingOutput = outputFiles.find(f => f.startsWith(baseName) && f.endsWith('.out'));
      }
      
      if (correspondingOutput) {
        pairs.push({
          input: inputFile,
          output: correspondingOutput
        });
        console.log(`Matched test case: ${inputFile} -> ${correspondingOutput}`);
      } else {
        console.warn(`No matching output file found for input: ${inputFile}`);
      }
    }
    
    console.log(`Successfully matched ${pairs.length} test case pairs`);
    return pairs;
  }

  /**
   * Public method to test judging a single submission (for testing purposes)
   */
  public async testJudgeSubmission(submissionData: any, problem: IProblem): Promise<any> {
    console.log(`Test judging submission for problem ${problem._id}`);

    try {
      // Check language support
      if (!languageSupport[submissionData.language as keyof typeof languageSupport]) {
        throw new Error(`Language ${submissionData.language} is not supported`);
      }

      const langConfig = languageSupport[submissionData.language as keyof typeof languageSupport];

      // Create working directory for this submission
      const workDir = `/tmp/test_judge_${Date.now()}`;
      const userSolutionDir = path.join(workDir, 'user-solutions');
      const testDataDir = path.join(workDir, 'testdata');

      // Clean up and create directories
      await this.setupWorkingDirectory(workDir, userSolutionDir, testDataDir);

      // Write user solution files - determine filename based on language
      let filename = 'main.cpp';
      if (submissionData.language === 'gcc c11') filename = 'main.c';
      else if (submissionData.language === 'rust') filename = 'main.rs';
      else if (submissionData.language === 'pseudo') filename = 'main.ps';
      
      const filePath = path.join(userSolutionDir, filename);
      fs.writeFileSync(filePath, submissionData.code || '');

      // Compile if needed
      if (langConfig.compileCommand) {
        await this.compileUserSolution(workDir, langConfig.compileCommand);
      }

      // Copy test data
      await this.copyTestData(problem._id as string, testDataDir);

      // Run test cases
      const testResults = await this.runTestCases(
        workDir,
        userSolutionDir,
        testDataDir,
        problem,
        langConfig.executeCommand
      );

      // Calculate final score and status
      const finalResult = this.calculateFinalResult(testResults, problem);

      // Clean up
      await this.cleanupWorkingDirectory(workDir);

      console.log(`Test judging completed: ${finalResult.status} (${finalResult.score} points)`);

      return {
        status: finalResult.status,
        score: finalResult.score,
        maxTime: finalResult.maxTime,
        maxMemory: finalResult.maxMemory,
        individual: testResults
      };

    } catch (error) {
      console.error(`Error in test judging:`, error);
      return {
        status: 'System Error',
        score: 0,
        maxTime: 0,
        maxMemory: 0,
        individual: [],
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

export default Judger;