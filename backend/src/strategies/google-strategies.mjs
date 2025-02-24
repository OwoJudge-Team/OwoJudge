import passport from "passport"
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { User } from "../mongoose/schemas/users.mjs"
import { randomString, hashString } from "../utils/hash-password.mjs"

const GOOGLE_CLIENT_ID = '4309851938-3trqn9hcofle3rnc0058v3jt2hl5nmlk.apps.googleusercontent.com'
const GOOGLE_CLIENT_SECRET = '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'

passport.serializeUser((user, done) => {
    done(null, user.googleID)
})

passport.deserializeUser(async (googleID, done) => {
    try {
        const findUser = await User.findOne({ googleID: googleID })
        if (!findUser) {
            throw new Error('User not found')
        }
        done(null, findUser)
    }
    catch (error) {
        done(error, null)
    }
})

export default passport.use(new GoogleStrategy(
    {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: "http://localhost:8787/api/auth/google/callback"
    },
    async (accessToken, refreshToken, profile, done) => {
        try {
            const findUser = await User.findOne({ googleID: profile.id })
            if (!findUser) {
                const newUser = new User({
                    username: profile.emails[0].value,
                    displayName: profile.displayName,
                    password: hashString(randomString(32)),
                    isAdmin: false,
                    solvedProblem: 0,
                    solvedProblems: [],
                    rating: 0,
                    googleID: profile.id,
                })
                const savedUser = await newUser.save()
                return done(null, savedUser)
            }
            return done(null, findUser)
        }
        catch (error) {
            console.log(`Error: ${error}`)
            return done(error, null)
        }
    }
))