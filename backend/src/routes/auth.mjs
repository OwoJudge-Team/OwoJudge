import { Router } from 'express'
import passport from 'passport'
import '../strategies/local-strategies.mjs'
import googleStrategies from '../strategies/google-strategies.mjs'

const authRouter = Router()

authRouter.post('/api/auth', 
    passport.authenticate('local'), 
    (request, response) => {
        response.sendStatus(201)
    }
)

authRouter.get('/api/auth/status', (request, response) => {
    return request.user
        ? response.status(200).send(request.user)
        : response.sendStatus(401)
})

authRouter.post('/api/auth/logout', (request, response) => {
    if (!request.user) {
        return response.sendStatus(401)
    }
    request.logout((error) => {
        if (error) {
            return response.sendStatus(400)
        }
        response.sendStatus(200)
    })
})

authRouter.get('/api/auth/google', passport.authenticate('google', {
    scope: ['email', 'profile']
}))

authRouter.get('/api/auth/google/callback', passport.authenticate('google'), (request, response) => {
    return request.user
        ? response.status(201).send(request.user)
        : response.sendStatus(401)
})

export default authRouter