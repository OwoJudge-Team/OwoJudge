import { Router } from 'express'
import { query, validationResult, matchedData, checkSchema } from 'express-validator'
import { User } from '../mongoose/schemas/users.mjs'
import { createUserValidation } from '../validations/create-user-validation.mjs'
import { hashString } from '../utils/hash-password.mjs'
import { getUsersValidation } from '../validations/get-user-validation.mjs'
import { updateUserValidation } from '../validations/update-user-validation.mjs'

const usersRouter = Router()

usersRouter.get(
    '/api/users',
    checkSchema(getUsersValidation),
    async (request, response) => {
        const { query: { filter, value } } = request
        const result = validationResult(request)
        if (!filter && !value) {
            const users = await User.find().select('id username displayName').sort({ id: -1 })
            return response.status(200).send(users)
        }
        if (!result.isEmpty()) {
            console.log(result.array())
            return response.status(400).send(result.array())
        }
        try {
            const users = await User
                .find()
                .where(filter)
                .equals({ $regex: `.*${value}.*`, $options: 'i' })
                .select('username displayName rating')
            return response.status(200).send(users)
        }
        catch (error) {
            console.log(error)
            return response.status(400).send(error)
        }
    }
)

usersRouter.get('/api/users/:username', async (request, response) => {
    const { username } = request.params
    if (!request.user) {
        return response.status(401).send('Please login first')
    }
    try {
        const user = await User.findOne({ username: username }).select()
        if (!user) {
            return response.sendStatus(404);
        }
        return response.status(200).send(user)
    }
    catch (error) {
        console.log(error)
        return response.status(400).send(error)
    }
})

usersRouter.post(
    '/api/users',
    checkSchema(createUserValidation),
    async (request, response) => {
        if (!request.user) {
            return response.status(401).send('Please login first')
        }
        const result = validationResult(request)
        if (!result.isEmpty()) {
            return response.status(400).send(result.array())
        }
        const data = matchedData(request)
        if (data.isAdmin && !request.user.isAdmin) {
            return response.status(401).send('Please login as an admin first')
        }
        const newUser = new User(data)
        try {
            newUser.password = hashString(newUser.password)
            newUser.solvedProblem = 0
            newUser.solvedProblems = []
            newUser.rating = 0
            const savedUser = await newUser.save()
            return response.status(201).send(savedUser)
        }
        catch (error) {
            console.log(`Error: ${error}`)
            return response.status(400).send(error)
        }
    }
)

usersRouter.delete('/api/users/:username', async (request, response) => {
    if (!request.user || !request.user.isAdmin) {
        return response.status(401).send('Please login as an admin first')
    }
    const { username } = request.params
    try {
        const user = await User.findOneAndDelete({ username: username })
        if (!user) {
            return response.sendStatus(404);
        }
        return response.status(201).send(user)
    }
    catch (error) {
        console.log(error)
        return response.status(400).send(error)
    }
})

usersRouter.patch(
    '/api/users/:username', 
    checkSchema(updateUserValidation), 
    async (request, response) => {
        if (!request.user) {
            return response.status(401).send('Please login first')
        }
        const { username } = request.params
        const data = matchedData(request)
        try {
            if (Object.keys(data).length === 1) {
                throw {
                    message: 'No matched patch data',
                    error: validationResult(request).array(),
                }
            }
            if (data.password) {
                data.password = hashString(data.password)
            }
            let user = await User.findOneAndUpdate({ username: username }, data)
            if (!user) {
                return response.sendStatus(404);
            }
            user = await User.findOne({ username: username }).select()
            return response.status(201).send(user)
        }
        catch (error) {
            console.log(error)
            return response.status(400).send(error)
        }
    }
)

export default usersRouter