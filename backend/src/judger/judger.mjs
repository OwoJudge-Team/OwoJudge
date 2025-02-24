import MongoStore from 'connect-mongo'
import mongoose from 'mongoose'

mongoose.connect('mongodb://localhost/judge')
    .then(() => console.log('Connected to mongo'))
    .catch((error) => console.log(`Error: ${error}`))

import { Problem } from '../mongoose/schemas/problems.mjs'
import { Submission } from '../mongoose/schemas/submission.mjs'
import { sleep } from './sleep.mjs'
import child_process from 'child_process'
import FileSystem from 'fs'

const aexec = util.promisify(child_process.exec);
const compile = async (submission) => {
    const { userSolution } = submission
    for (let i = 0; i < userSolution.length; ++i) {
        FileSystem.writeFileSync('./user-solutions/' + userSolution[i].filename, userSolution[i].content)
    }
    try {
        const compileResult = await aexec(languageSupport[submission.language].compileCommand)
    }
    catch (error) {
        console.log(error)
        await Submission.findByIdAndUpdate(submission.id, { status: 'CE' })
        return false
    }
    return true
}

const runSandbox = async (submission, testcase) => {
    const { timeLimit, memoryLimit } = await Problem.findOne({ displayID: submission.problemID })
    try {
        const sandbox = await aexec(
            `isolate --run -E PATH=$PATH -i input -o output --mem=${memoryLimit} --time=${timeLimit / 1000} --meta=user-solutions/meta.out ` + 
            '-- ' + languageSupport[submission.language].executeCommand)
    }
    catch (error) {
        console.log(error)
        submission.result.individual[testcase] = {}
        submission.result.individual[testcase].status = 'RE'
        await Submission.findByIdAndUpdate(submission.id, submission)
        return false
    }
    return true
}

const getMeta = () => {
    const meta = FileSystem.readFileSync('./user-solutions/meta.out').toString()
        .trim().split('\n')
    let parsedMeta = {}
    meta.forEach((line) => {
        const [name, value] = line.split(':')
        parsedMeta[name] = value
    })
    return parsedMeta
}

const moveFiles = async (submission, isolateFolder) => {
    const { compileCommand, executeCommand } = languageSupport[submission.language]
    if (compileCommand === '') {
        for (let i = 0; i < submission.userSolution.length; ++i) {
            await aexec(
                'cp ./user-solutions/' + submission.userSolution[i].filename + 
                ' ' + isolateFolder)
        }
        return
    }
    // // This is for --cg mode
    // FileSystem.writeFileSync(isolateFolder + 'execute', '#!/bin bash\n' + executeCommand)
    // FileSystem.chmodSync(isolateFolder + 'execute', '755')
    await aexec('mv ./user-solutions/main ' + isolateFolder + 'main')
}

const run = async (submission, isolateFolder) => {
    const problem = await Problem.findOne({ displayID: submission.problemID })
    let status = 'AC'
    let score = 0
    for (let i = 0; i < problem.testcase.length; ++i) {
        FileSystem.writeFileSync(isolateFolder + 'input', problem.testcase[i].input)
        await moveFiles(submission, isolateFolder)
        
        if (!await runSandbox(submission, i)) {
            submission.result.individual[i].status = 'RE'
            if (status !== 'TLE') status = 'RE'
            continue
        }
        const meta = getMeta()
        if (parseInt(meta['time-wall']) > problem.timeLimit) status = 'TLE'
        submission.result.individual[i] = {}
        submission.result.individual[i].time = parseInt(meta['time-wall'])
        submission.result.individual[i].memory = parseInt(meta['max-rss'])
        submission.result.maxTime = Math.max(submission.result.maxTime, submission.result.individual[i].time)
        submission.result.maxMemory = Math.max(submission.result.maxMemory, submission.result.individual[i].memory)
        const userOutput = FileSystem.readFileSync(isolateFolder + 'output').toString()
        const answer = problem.testcase[i].output
        if (userOutput.trim() === answer.trim()) {
            submission.result.individual[i].status = 'AC'
            score += problem.testcase[i].point
        }
        else {
            if (status === 'AC') status = 'WA' 
            submission.result.individual[i].status = 'WA'
        }
        await Submission.findByIdAndUpdate(submission.id, submission)
    }
    submission.status = status
    submission.result.score = score
    await Submission.findByIdAndUpdate(submission.id, submission)
}

const judge = async (submission) => {
    const init = await aexec('isolate --init')
    if (init.error) {
        console.log(init.error)
        return
    }
    const isolateFolder = init.stdout.substring(0, init.stdout.length - 1) + '/box/'
    if (languageSupport[submission.language].compileCommand != '' && !await compile(submission)) {
        return
    }
    await run(submission, isolateFolder)
}

export const submissionListener = async () => {
    while (true) {
        const timer = sleep(500)
        const pendingSubmissions = await Submission.find({ status: 'pending' }).sort({ createdTime: -1 })
        const firstSubmission = pendingSubmissions[0]
        if (firstSubmission) {
            await judge(firstSubmission)
        }
        await timer
    }
}