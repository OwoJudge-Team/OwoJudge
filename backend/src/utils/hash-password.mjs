import crypto, { scryptSync, randomBytes } from 'crypto'
import FileSystem from 'fs'

export const randomString = (size) => {
    return randomBytes(size).toString('hex')
}

var salt = undefined

const readSalt = () => {
    try {
        const SALT = JSON.parse(FileSystem.readFileSync('./salt.json')).salt
        salt = SALT
        console.log(SALT)
    }
    catch (error) {
        salt = crypto.randomBytes(32).toString('hex')
        FileSystem.writeFileSync('./salt.json', JSON.stringify({ salt: salt }, null, 4))
    }
}

export const hashString = (str) => {
    if (!salt) {
        readSalt()
    }
    return scryptSync(str, salt, 32).toString('hex')
}

export const stringMatch = (str, hashedStr) => {
    return hashString(str) === hashedStr
}