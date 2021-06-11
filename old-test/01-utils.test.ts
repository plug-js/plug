import { AssertionError } from 'assert'
import { parseArguments, findCaller } from '../src/utils'
import { isArray } from '../src/types'

import { expect } from 'chai'

type TestOptions = {
  name?: string,
  description?: string,
  test?: any[],
}

describe('Utilities', () => {
  it('should find the caller', () => {
    expect(findCaller()).to.equal('test/01-utils.test.ts:15:11')
  })

  it('should parse some arguments', () => {
    expect(parseArguments<TestOptions>('test', isArray, [])).to.eql({})

    expect(parseArguments<TestOptions>('test', isArray, [ [ 'foo' ] ])).to.eql({
      test: [ 'foo' ]
    })

    expect(parseArguments<TestOptions>('test', isArray, [ { name: 'foo' } ])).to.eql({
      name: 'foo',
    })

    // proper name / description

    expect(parseArguments<TestOptions>('test', isArray, [ 'theName' ])).to.eql({
      name: 'theName',
    })

    expect(parseArguments<TestOptions>('test', isArray, [ 'theName', 'theDescription' ])).to.eql({
      name: 'theName',
      description: 'theDescription',
    })

    expect(parseArguments<TestOptions>('test', isArray, [ 'theName', [] ])).to.eql({
      name: 'theName',
      test: [],
    })

    expect(parseArguments<TestOptions>('test', isArray, [ 'theName', 'theDescription', [] ])).to.eql({
      name: 'theName',
      description: 'theDescription',
      test: [],
    })

    // empty name / description

    expect(parseArguments<TestOptions>('test', isArray, [ '' ])).to.eql({
      name: '',
    })

    expect(parseArguments<TestOptions>('test', isArray, [ '', '' ])).to.eql({
      name: '',
      description: '',
    })

    expect(parseArguments<TestOptions>('test', isArray, [ '', [] ])).to.eql({
      name: '',
      test: [],
    })

    expect(parseArguments<TestOptions>('test', isArray, [ '', '', [] ])).to.eql({
      name: '',
      description: '',
      test: [],
    })

    // undefined name / description

    expect(parseArguments<TestOptions>('test', isArray, [ undefined ])).to.eql({
    })

    expect(parseArguments<TestOptions>('test', isArray, [ undefined, undefined ])).to.eql({
    })

    expect(parseArguments<TestOptions>('test', isArray, [ undefined, [] ])).to.eql({
      test: [],
    })

    expect(parseArguments<TestOptions>('test', isArray, [ undefined, undefined, [] ])).to.eql({
      test: [],
    })

    // negative tests

    expect(() => parseArguments<TestOptions>('test', isArray, [ '', '', '' ]))
      .to.throw(AssertionError, 'Too many arguments (max: 2, was: 3)')

    expect(() => parseArguments<TestOptions>('test', isArray, [ [], '', [] ]))
      .to.throw(AssertionError, 'Invalid type for "name": array[length=0]')

    expect(() => parseArguments<TestOptions>('test', isArray, [ '', [], [] ]))
      .to.throw(AssertionError, 'Invalid type for "description": array[length=0]')
  })
})
