import { test, expect, vi, describe } from "vitest"
import { hashString, stringMatch } from "../utils/hash-password.mjs"

describe('hash-password', () => {
    test('should read salt from json', () => {
        const a = hashString('this is a string')
        const b = hashString('this is a string')
        expect(a === b)
        const c = hashString('this i a strings')
        expect(a !== c)
    })
    test('match string', () => {
        const hashedString = hashString('any string')
        const regularString = 'any string'
        const anotherString = 'another string'
        expect(stringMatch(regularString, hashedString))
        expect(!stringMatch(anotherString, hashedString))
    })
})