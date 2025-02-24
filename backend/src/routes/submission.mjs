import { Router } from 'express'
import { query, validationResult, matchedData, checkSchema, check } from 'express-validator'
import { Submission } from '../mongoose/schemas/submission.mjs'
import { createSubmissionValidation } from '../validations/create-submission-validation.mjs'

const submissionRouter = Router()

submissionRouter.get('/api/submissions', async (request, response) => {
    if (!request.user) {
        return response.status(401).send('Please login first')
    }
    try {
        const submissions = await Submission
            .find()
            .select('problemID username status language createdTime')
            .sort({ createdTime: 1 })
        return response.status(200).send(submissions)
    }
    catch (error) {
        if (error) {
            return response.status(400).send(error)
        }
    }
})

submissionRouter.post('/api/submissions', 
    checkSchema(createSubmissionValidation), 
    async (request, response) => {
        if (!request.user) {
            return response.status(401).send('Please login first')
        }
        const result = validationResult(request)
        if (!result.isEmpty()) {
            return response.status(400).send(result.array())
        }
        const data = matchedData(request)
        const newSubmission = new Submission(data)
        try {
            newSubmission.createdTime = Date.now()
            newSubmission.status = 'pending'
            newSubmission.result = {
                score: -1,
                maxTime: -1,
                maxMemory: -1,
                individual: []
            }
            const savedSubmission = await newSubmission.save()
            return response.status(201).send(savedSubmission)
        }
        catch (error) {
            console.log(`Error: ${error}`)
            return response.status(400).send(error)
        }
    }
)

export default submissionRouter