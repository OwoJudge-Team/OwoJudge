import express from 'express'
import cookieParser from 'cookie-parser'
import session from 'express-session'
import passport from 'passport'
import MongoStore from 'connect-mongo'
import mongoose from 'mongoose'
import usersRouter from './routes/users.mjs'
import problemsRouter from './routes/problems.mjs'
import submissionRouter from './routes/submission.mjs'
import authRouter from './routes/auth.mjs'

export const createApp = () => {
    mongoose.connect('mongodb://localhost/judge')
        .then(() => console.log('Connected to mongo'))
        .catch((error) => console.log(`Error: ${error}`))

    const app = express()
    const oneMinute = 60000
    const oneHour = oneMinute * 60

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