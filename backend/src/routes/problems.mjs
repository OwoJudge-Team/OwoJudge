import { Router } from 'express'
import { query, validationResult, matchedData, checkSchema, check } from 'express-validator'
import { Problem } from '../mongoose/schemas/problems.mjs'
import { createProblemValidation } from '../validations/create-problem-validation.mjs'
import { updateProblemValidation } from '../validations/update-problem-validation.mjs'

const problemsRouter = Router()

problemsRouter.get('/api/problems', async (request, response) => {
    try {
        const problems = await Problem
            .find()
            .select('id displayID title createdTime')
            .sort({ createdTime: -1 })
        return response.status(200).send(problems)
    }
    catch (error) {
        if (error) {
            return response.status(400).send(error)
        }
    }
})

problemsRouter.get('/api/problems/:displayID', async (request, response) => {
    if (!request.user) {
        return response.status(401).send('Please login first')
    }
    const { displayID } = request.params
    try {
        const problem = await Problem
            .findOne({ displayID: displayID })
        if (!problem) {
            return response.sendStatus(404)
        }
        return response.status(200).send(problem)
    }
    catch (error) {
        console.log(error)
        return response.status(400).send(error)
    }
})

problemsRouter.post('/api/problems', 
    checkSchema(createProblemValidation), 
    async (request, response) => {
        if (!request.user || !request.user.isAdmin) {
            return response.status(401).send('Please login as an admin first')
        }
        const result = validationResult(request)
        if (!result.isEmpty()) {
            return response.status(400).send(result.array())
        }
        const data = matchedData(request)
        const newProblem = new Problem(data)
        try {
            newProblem.createdTime = Date.now()
            const savedProblem = await newProblem.save()
            return response.status(201).send(savedProblem)
        }
        catch (error) {
            console.log(`Error: ${error}`)
            return response.status(400).send(error)
        }
    }
)

problemsRouter.delete('/api/problems/:displayID', async (request, response) => {
    if (!request.user || !request.user.isAdmin) {
        return response.status(401).send('Please login as an admin first')
    }
    const { displayID } = request.params
    try {
        const problem = await Problem
            .findOneAndDelete({ displayID: displayID })
        if (!problem) {
            return response.sendStatus(404)
        }
        return response.status(200).send(problem)
    }
    catch (error) {
        console.log(error)
        return response.status(400).send(error)
    }
})

problemsRouter.patch(
    '/api/problems/:displayID',
    checkSchema(updateProblemValidation), 
    async (request, response) => {
        if (!request.user) {
            return response.status(401).send('Please login first')
        }
        const { displayID } = request.params
        const data = matchedData(request)
        console.log(data)
        try {
            if (Object.keys(data).length === 2) {
                throw {
                    message: 'No matched patch data',
                    error: validationResult(request).array(),
                }
            }
            let problem = await Problem.findOneAndUpdate({ displayID: displayID }, data)
            if (!problem) {
                return response.sendStatus(404);
            }
            problem = await Problem.findOne({ displayID: displayID }).select()
            return response.status(201).send(problem)
        }
        catch (error) {
            console.log(error)
            return response.status(400).send(error)
        }
    }
)

export default problemsRouter