import { Router, Request, Response } from 'express';
import passport from 'passport'
import '../strategies/local-strategies.js'

const authRouter: Router = Router()

authRouter.post('/api/auth', 
    passport.authenticate('local'), 
    (request: Request, response: Response) => {
        response.sendStatus(201)
    }
)

authRouter.get('/api/auth/status', (request: Request, response: Response) => {
    return request.user
        ? response.status(200).send(request.user)
        : response.sendStatus(401)
})

authRouter.post('/api/auth/logout', (request: Request, response: Response) => {
    if (!request.user) {
        return response.sendStatus(401)
    }
    request.logout((error: Error) => {
        if (error) {
            return response.sendStatus(400)
        }
        response.sendStatus(200)
    })
})

export default authRouter