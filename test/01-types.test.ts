import * as t from '../src/types'

import { AssertionError } from 'assert'
import { expect } from 'chai'

describe('Types', () => {
  it('should check for a non-empty array', () => {
    expect(t.isNonEmptyArray([])).to.be.false
    expect(t.isNonEmptyArray([ 1 ])).to.be.true
  })

  it('should assert for a non-empty array', () => {
    expect(() => t.assertNonEmptyArray([])).to.throw(AssertionError, 'Array is empty')
    expect(() => t.assertNonEmptyArray([], 'Blimey! Nothing there')).to.throw(AssertionError, 'Blimey! Nothing there')
    expect(t.assertNonEmptyArray([ 1 ])).to.be.undefined
  })

  it('should check for a non-empty string', () => {
    expect(t.isNonEmptyString('')).to.be.false
    expect(t.isNonEmptyString('x')).to.be.true
  })

  it('should assert for a non-empty string', () => {
    expect(() => t.assertNonEmptyString('')).to.throw(AssertionError, 'String is empty')
    expect(() => t.assertNonEmptyString('', 'Blimey! Nothing there')).to.throw(AssertionError, 'Blimey! Nothing there')
    expect(t.assertNonEmptyString('x')).to.be.undefined
  })
})
