import { test, expect, vi, describe } from 'vitest'
import { hashString, stringMatch } from '../utils/hash-password'

describe('hash-password', () => {
    test('should read salt from json', () => {
        const a: string = hashString('this is a string')
        const b: string = hashString('this is a string')
        expect(a === b).toBe(true)
        const c: string = hashString('this i a strings')
        expect(a !== c).toBe(true)
    })
    test('match string', () => {
        const hashedString: string = hashString('any string')
        const regularString: string = 'any string'
        const anotherString: string = 'another string'
        expect(stringMatch(regularString, hashedString)).toBe(true)
        expect(!stringMatch(anotherString, hashedString)).toBe(true)
    })
})