import express, { Application } from 'express'
import cookieParser from 'cookie-parser'
import session from 'express-session'
import passport from 'passport'
import MongoStore from 'connect-mongo'
import mongoose from 'mongoose'
import usersRouter from './routes/users.js'
import problemsRouter from './routes/problems.js'
import submissionRouter from './routes/submission.js'
import authRouter from './routes/auth.js'

export const createApp = (): Application => {
    mongoose.connect('mongodb://localhost/judge')
        .then(() => console.log('Connected to mongo'))
        .catch((error: Error) => console.log(`Error: ${error.message}`))

    const app: Application = express()
    const oneMinute: number = 60000
    const oneHour: number = oneMinute * 60

    app.use(express.json())
    app.use(cookieParser('cj6u.4t/6'))
    app.use(session({
        secret: 'z/ fup6ql4',
        saveUninitialized: false,
        resave: false,
        cookie: {
            maxAge: oneHour * 24, // One Day
        },
        store: MongoStore.create({
            client: mongoose.connection.getClient(),
        }),
    }))
    app.use(passport.initialize())
    app.use(passport.session())

    // Place to put custom routes
    app.use(usersRouter)
    app.use(problemsRouter)
    app.use(submissionRouter)
    app.use(authRouter)
    return app
}