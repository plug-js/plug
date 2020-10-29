import * as t from '../src/types'

import { Task } from '../src/task'
import { Plug } from '../src/plug'

import { AssertionError, default as assert } from 'assert'
import { expect } from 'chai'

describe('Types', () => {
  describe('basic types', () => {
    it('should perform some basic checks', () => {
      expect(t.isUndefined(undefined)).to.be.true
      expect(t.isNull(null)).to.be.true
      expect(t.isBoolean(true)).to.be.true
      expect(t.isNumber(123)).to.be.true
      expect(t.isBigInt(BigInt(123))).to.be.true
      expect(t.isString('foobar')).to.be.true
      expect(t.isSymbol(Symbol())).to.be.true
      expect(t.isFunction(() => {})).to.be.true
      expect(t.isArray([])).to.be.true

      expect(t.isUndefined(null)).to.be.false
      expect(t.isNull(undefined)).to.be.false
      expect(t.isBoolean(null)).to.be.false
      expect(t.isNumber(null)).to.be.false
      expect(t.isBigInt(null)).to.be.false
      expect(t.isString(null)).to.be.false
      expect(t.isSymbol(null)).to.be.false
      expect(t.isFunction(null)).to.be.false
      expect(t.isArray(null)).to.be.false

      expect(t.isObject({})).to.be.true
      expect(t.isObject(null)).to.be.false
      expect(t.isObject([])).to.be.false
    })

    it('should perform some basic assertions', () => {
      expect(t.assertUndefined(undefined)).to.be.undefined
      expect(t.assertNull(null)).to.be.undefined
      expect(t.assertBoolean(true)).to.be.undefined
      expect(t.assertNumber(123)).to.be.undefined
      expect(t.assertBigInt(BigInt(123))).to.be.undefined
      expect(t.assertString('foobar')).to.be.undefined
      expect(t.assertSymbol(Symbol())).to.be.undefined
      expect(t.assertFunction(() => {})).to.be.undefined
      expect(t.assertArray([])).to.be.undefined

      expect(() => t.assertUndefined(null)).to.throw(AssertionError, 'Argument of type null is not undefined')
      expect(() => t.assertNull(undefined)).to.throw(AssertionError, 'Argument of type undefined is not null')
      expect(() => t.assertBoolean(null)).to.throw(AssertionError, 'Argument of type null is not a boolean')
      expect(() => t.assertNumber(null)).to.throw(AssertionError, 'Argument of type null is not a number')
      expect(() => t.assertBigInt(null)).to.throw(AssertionError, 'Argument of type null is not a bigint')
      expect(() => t.assertString(null)).to.throw(AssertionError, 'Argument of type null is not a string')
      expect(() => t.assertSymbol(null)).to.throw(AssertionError, 'Argument of type null is not a symbol')
      expect(() => t.assertFunction(null)).to.throw(AssertionError, 'Argument of type null is not a function')
      expect(() => t.assertArray(null)).to.throw(AssertionError, 'Argument of type null is not an array')

      expect(() => t.assertUndefined(null, 'Wrong')).to.throw(AssertionError, 'Wrong (was: null)')
      expect(() => t.assertNull(undefined, 'Wrong')).to.throw(AssertionError, 'Wrong (was: undefined)')
      expect(() => t.assertBoolean(null, 'Wrong')).to.throw(AssertionError, 'Wrong (was: null)')
      expect(() => t.assertNumber(null, 'Wrong')).to.throw(AssertionError, 'Wrong (was: null)')
      expect(() => t.assertBigInt(null, 'Wrong')).to.throw(AssertionError, 'Wrong (was: null)')
      expect(() => t.assertString(null, 'Wrong')).to.throw(AssertionError, 'Wrong (was: null)')
      expect(() => t.assertSymbol(null, 'Wrong')).to.throw(AssertionError, 'Wrong (was: null)')
      expect(() => t.assertFunction(null, 'Wrong')).to.throw(AssertionError, 'Wrong (was: null)')
      expect(() => t.assertArray(null, 'Wrong')).to.throw(AssertionError, 'Wrong (was: null)')

      expect(t.assertObject({})).to.be.undefined

      expect(() => t.assertObject(null)).to.throw(AssertionError, 'Argument of type null is not an object')
      expect(() => t.assertObject([])).to.throw(AssertionError, 'Argument of type array[length=0] is not an object')

      expect(() => t.assertObject(null, 'Wrong')).to.throw(AssertionError, 'Wrong (was: null)')
      expect(() => t.assertObject([], 'Wrong')).to.throw(AssertionError, 'Wrong (was: array[length=0])')
    })

    it('should perform some type checks', () => {
      expect(t.isType(undefined, 'undefined')).to.be.true
      expect(t.isType(null, 'null')).to.be.true
      expect(t.isType(true, 'boolean')).to.be.true
      expect(t.isType(123, 'number')).to.be.true
      expect(t.isType(BigInt(123), 'bigint')).to.be.true
      expect(t.isType('foobar', 'string')).to.be.true
      expect(t.isType(Symbol(), 'symbol')).to.be.true
      expect(t.isType(()=> {}, 'function')).to.be.true
      expect(t.isType([],'array')).to.be.true

      expect(t.isType(null, 'undefined')).to.be.false
      expect(t.isType(undefined, 'null')).to.be.false
      expect(t.isType(null, 'boolean')).to.be.false
      expect(t.isType(null, 'number')).to.be.false
      expect(t.isType(null, 'bigint')).to.be.false
      expect(t.isType(null, 'string')).to.be.false
      expect(t.isType(null, 'symbol')).to.be.false
      expect(t.isType(null, 'function')).to.be.false
      expect(t.isType(null, 'array')).to.be.false

      expect(t.isType({}, 'object')).to.be.true
      expect(t.isType(null, 'object')).to.be.false
      expect(t.isType([], 'object')).to.be.false

      class MyClass {}
      const myInstance = new MyClass()

      expect(t.isType(myInstance, MyClass)).to.be.true
      expect(t.isType(MyClass, MyClass)).to.be.false
      expect(t.isType({}, MyClass)).to.be.false
      expect(t.isType(null, MyClass)).to.be.false
      expect(t.isType(undefined, MyClass)).to.be.false

      expect(() => (<any> t.isType)(null, 'foobar')).to.throw(AssertionError, 'Invalid type specified for check: "foobar"')
      expect(() => (<any> t.isType)(null, false)).to.throw(AssertionError, 'Invalid type specified for check: boolean')
    })

    it('should perform some type assertions', () => {
      expect(t.assertType(undefined, 'undefined')).to.be.undefined
      expect(t.assertType(null, 'null')).to.be.undefined
      expect(t.assertType(true, 'boolean')).to.be.undefined
      expect(t.assertType(123, 'number')).to.be.undefined
      expect(t.assertType(BigInt(123), 'bigint')).to.be.undefined
      expect(t.assertType('foobar', 'string')).to.be.undefined
      expect(t.assertType(Symbol(), 'symbol')).to.be.undefined
      expect(t.assertType(()=> {}, 'function')).to.be.undefined
      expect(t.assertType([],'array')).to.be.undefined

      expect(() => t.assertType(null, 'undefined')).to.throw(AssertionError, 'Argument of type null is not undefined')
      expect(() => t.assertType(undefined, 'null')).to.throw(AssertionError, 'Argument of type undefined is not null')
      expect(() => t.assertType(null, 'boolean')).to.throw(AssertionError, 'Argument of type null is not a boolean')
      expect(() => t.assertType(null, 'number')).to.throw(AssertionError, 'Argument of type null is not a number')
      expect(() => t.assertType(null, 'bigint')).to.throw(AssertionError, 'Argument of type null is not a bigint')
      expect(() => t.assertType(null, 'string')).to.throw(AssertionError, 'Argument of type null is not a string')
      expect(() => t.assertType(null, 'symbol')).to.throw(AssertionError, 'Argument of type null is not a symbol')
      expect(() => t.assertType(null, 'function')).to.throw(AssertionError, 'Argument of type null is not a function')
      expect(() => t.assertType(null, 'array')).to.throw(AssertionError, 'Argument of type null is not an array')

      expect(() => t.assertType(null, 'undefined', 'Wrong')).to.throw(AssertionError, 'Wrong (was: null)')
      expect(() => t.assertType(undefined, 'null', 'Wrong')).to.throw(AssertionError, 'Wrong (was: undefined)')
      expect(() => t.assertType(null, 'boolean', 'Wrong')).to.throw(AssertionError, 'Wrong (was: null)')
      expect(() => t.assertType(null, 'number', 'Wrong')).to.throw(AssertionError, 'Wrong (was: null)')
      expect(() => t.assertType(null, 'bigint', 'Wrong')).to.throw(AssertionError, 'Wrong (was: null)')
      expect(() => t.assertType(null, 'string', 'Wrong')).to.throw(AssertionError, 'Wrong (was: null)')
      expect(() => t.assertType(null, 'symbol', 'Wrong')).to.throw(AssertionError, 'Wrong (was: null)')
      expect(() => t.assertType(null, 'function', 'Wrong')).to.throw(AssertionError, 'Wrong (was: null)')
      expect(() => t.assertType(null, 'array', 'Wrong')).to.throw(AssertionError, 'Wrong (was: null)')

      expect(t.assertType({}, 'object')).to.be.undefined

      expect(() => t.assertType(null, 'object')).to.throw(AssertionError, 'Argument of type null is not an object')
      expect(() => t.assertType([], 'object')).to.throw(AssertionError, 'Argument of type array[length=0] is not an object')

      expect(() => t.assertType(null, 'object', 'Wrong')).to.throw(AssertionError, 'Wrong (was: null)')
      expect(() => t.assertType([], 'object', 'Wrong')).to.throw(AssertionError, 'Wrong (was: array[length=0])')

      class MyClass {}
      const myInstance = new MyClass()

      expect(t.assertType(myInstance, MyClass)).to.be.undefined

      expect(() => t.assertType(MyClass, MyClass)).to.throw(AssertionError, 'Argument of type function is not an instance of "MyClass"')
      expect(() => t.assertType({}, MyClass)).to.throw(AssertionError, 'Argument of type object is not an instance of "MyClass"')
      expect(() => t.assertType(null, MyClass)).to.throw(AssertionError, 'Argument of type null is not an instance of "MyClass"')
      expect(() => t.assertType(undefined, MyClass)).to.throw(AssertionError, 'Argument of type undefined is not an instance of "MyClass"')

      expect(() => t.assertType(MyClass, MyClass, 'Wrong')).to.throw(AssertionError, 'Wrong (was: function)')
      expect(() => t.assertType({}, MyClass, 'Wrong')).to.throw(AssertionError, 'Wrong (was: object)')
      expect(() => t.assertType(null, MyClass, 'Wrong')).to.throw(AssertionError, 'Wrong (was: null)')
      expect(() => t.assertType(undefined, MyClass, 'Wrong')).to.throw(AssertionError, 'Wrong (was: undefined)')

      expect(() => (<any> t.assertType)(null, 'foobar')).to.throw(AssertionError, 'Invalid type specified for assertion: "foobar"')
      expect(() => (<any> t.assertType)(null, false)).to.throw(AssertionError, 'Invalid type specified for assertion: boolean')

      expect(() => (<any> t.assertType)(null, 'foobar', 'Wrong')).to.throw(AssertionError, 'Invalid type specified for assertion: "foobar"')
      expect(() => (<any> t.assertType)(null, false, 'Wrong')).to.throw(AssertionError, 'Invalid type specified for assertion: boolean')
    })
  })

  describe('non-empty strings and arrays', () => {
    it('should assert a non-empty string', () => {
      expect(t.isNonEmptyString('')).to.be.false
      expect(t.isNonEmptyString('x')).to.be.true

      expect(() => t.assertNonEmptyString('')).to.throw(AssertionError, 'Argument of type string is not a non-empty string')
      expect(() => t.assertNonEmptyString('', 'Wrong')).to.throw(AssertionError, 'Wrong (was: string)')
      expect(t.assertNonEmptyString('x')).to.be.undefined
    })

    it('should assert a non-empty Array', () => {
      expect(t.isNonEmptyArray([])).to.be.false
      expect(t.isNonEmptyArray([ 1 ])).to.be.true

      expect(() => t.assertNonEmptyArray([])).to.throw(AssertionError, 'Argument of type array[length=0] is not a non-empty array')
      expect(() => t.assertNonEmptyArray([], 'Wrong')).to.throw(AssertionError, 'Wrong (was: array[length=0])')
      expect(t.assertNonEmptyArray([ 1 ])).to.be.undefined
    })
  })

  describe('array of types', () => {
    it('should check an array of primitive types', () => {
      const empty: any[] = []
      const good = [ 'foo', 'bar' ]
      const bad = [ 'foo', null, 'bar' ]

      expect(t.isArrayOf(true, 'string')).to.be.false

      expect(t.isArrayOf(empty, 'string')).to.be.true
      expect(t.isArrayOf(good, 'string')).to.be.true
      expect(t.isArrayOf(bad, 'string')).to.be.false
    })

    it('should assert an array of primitive types', () => {
      const empty: any[] = []
      const good = [ 'foo', 'bar' ]
      const bad = [ 'foo', null, 'bar' ]

      expect(() => t.assertArrayOf(true, 'string')).to.throw(AssertionError, 'Argument of type boolean is not an array')

      expect(t.assertArrayOf(empty, 'string')).to.be.undefined
      expect(t.assertArrayOf(good, 'string')).to.be.undefined
      expect(() => t.assertArrayOf(bad, 'string')).to.throw(AssertionError, 'Argument of type null is not a string [index=1]')

      expect(t.assertArrayOf(empty, 'string', 'Wrong')).to.be.undefined
      expect(t.assertArrayOf(good, 'string', 'Wrong')).to.be.undefined
      expect(() => t.assertArrayOf(bad, 'string', 'Wrong')).to.throw(AssertionError, 'Wrong (was: null) [index=1]')
    })

    it('should check a non-empty array of primitive types', () => {
      const empty: any[] = []
      const good = [ 'foo', 'bar' ]
      const bad = [ 'foo', null, 'bar' ]

      expect(t.isNonEmptyArrayOf(true, 'string')).to.be.false

      expect(t.isNonEmptyArrayOf(empty, 'string')).to.be.false
      expect(t.isNonEmptyArrayOf(good, 'string')).to.be.true
      expect(t.isNonEmptyArrayOf(bad, 'string')).to.be.false
    })

    it('should assert a non-empty array of primitive types', () => {
      const empty: any[] = []
      const good = [ 'foo', 'bar' ]
      const bad = [ 'foo', null, 'bar' ]

      expect(() => t.assertNonEmptyArrayOf(true, 'string')).to.throw(AssertionError, 'Argument of type boolean is not a non-empty array')

      expect(() => t.assertNonEmptyArrayOf(empty, 'string')).to.throw(AssertionError, 'Argument of type array[length=0] is not a non-empty array')
      expect(t.assertNonEmptyArrayOf(good, 'string')).to.be.undefined
      expect(() => t.assertNonEmptyArrayOf(bad, 'string')).to.throw(AssertionError, 'Argument of type null is not a string [index=1]')

      expect(() => t.assertNonEmptyArrayOf(empty, 'string', 'Wrong')).to.throw(AssertionError, 'Wrong (was: array[length=0])')
      expect(t.assertNonEmptyArrayOf(good, 'string', 'Wrong')).to.be.undefined
      expect(() => t.assertNonEmptyArrayOf(bad, 'string', 'Wrong')).to.throw(AssertionError, 'Wrong (was: null) [index=1]')
    })
  })

  describe('plug-specific types', () => {
    it('should assert a Task instance', () => {
      expect(t.isTask({})).to.be.false
      expect(t.isTask(new Task({ call: () => {}}))).to.be.true

      expect(() => t.assertTask(true)).to.throw(AssertionError, 'Argument of type boolean is not an instance of "Task"')
      expect(() => t.assertTask(true, 'Wrong')).to.throw(AssertionError, 'Wrong (was: boolean)')
      expect(t.assertTask(new Task({ call: () => {} }))).to.be.undefined
    })

    it('should assert a Plug instance', () => {
      expect(t.isPlug({})).to.be.false
      expect(t.isPlug(new Plug())).to.be.true

      expect(() => t.assertPlug({})).to.throw(AssertionError, 'Argument of type object is not an instance of "Plug"')
      expect(() => t.assertPlug({}, 'Wrong')).to.throw(AssertionError, 'Wrong (was: object)')
      expect(t.assertPlug(new Plug())).to.be.undefined
    })

    it('should assert a TaskCall function', () => {
      expect(t.isTaskCall({})).to.be.false
      expect(t.isTaskCall(() => {})).to.be.true

      expect(() => t.assertTaskCall(true)).to.throw(AssertionError, 'Argument of type boolean is not a "TaskCall" function')
      expect(() => t.assertTaskCall(true, 'Wrong')).to.throw(AssertionError, 'Wrong (was: boolean)')
      expect(t.assertTaskCall(() => {})).to.be.undefined
    })
  })
})
