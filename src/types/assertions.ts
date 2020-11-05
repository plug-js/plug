import assert from 'assert'

import {
  Assertor,
  Class,
  Guard,
  NonEmptyArray,
} from './types'

import {
  Task,
  TaskCall,
} from '../task'

/* ========================================================================== *
 * INTERNAL TYPES AND FUNCTIONS                                               *
/* ========================================================================== */

function createMessage(what: any, type: string, message?: string) {
  if (message) return `${message} (was: ${typeName(what)})`
  return `Argument of type ${typeName(what)} is not ${type}`
}

function classCheck<T>(clz: Class<T>): Guard<T> {
  return function(what: any): what is T {
    return isType<T>(what, clz)
  }
}

function classAssertor<T>(clz: Class<T>): Assertor<T> {
  return function(what: any, message?: string): asserts what is T {
    return assertType<T>(what, clz, message)
  }
}

type Type = {
  undefined: undefined,
  null: null,
  boolean: boolean,
  number: number,
  bigint: bigint,
  string: string,
  symbol: symbol,
  function: Function,
  object: object,
  array: [],
}

/* ========================================================================== *
 * A SANE TYPEOF                                                              *
 * ========================================================================== */

export function typeName(what: any): string {
  if (what === null) return 'null' // damn you, JavaScript
  const type = typeof what
  if (type !== 'object') return type
  if (Array.isArray(what)) return `array[length=${what.length}]`
  if (what.constructor.name === 'Object') return 'object'
  return `"${what.constructor.name}"`
}

/* ========================================================================== *
 * BASIC CHECKS AND ASSERTORS FOR PRIMITIVE TYPES                             *
 * ========================================================================== */

export function isUndefined(what: any): what is undefined {
  return what === undefined
}

export function isNull(what: any): what is null {
  return what === null
}

export function isBoolean(what: any): what is boolean {
  return typeof what === 'boolean'
}

export function isNumber(what: any): what is number {
  return typeof what === 'number'
}

export function isBigInt(what: any): what is bigint {
  return typeof what === 'bigint'
}

export function isString(what: any): what is string {
  return typeof what === 'string'
}

export function isSymbol(what: any): what is symbol {
  return typeof what === 'symbol'
}

export function isFunction(what: any): what is Function {
  return typeof what === 'function'
}

export function isObject(what: any): what is object {
  // seriously, javascript ???
  return !! (what && (typeof what === 'object') && (! Array.isArray(what)))
}

export function isArray(what: any): what is any[] {
  return Array.isArray(what)
}

/* ========================================================================== */

export function assertUndefined(what: any, message?: string): asserts what is undefined {
  assert(isUndefined(what), createMessage(what, 'undefined', message))
}

export function assertNull(what: any, message?: string): asserts what is null {
  assert(isNull(what), createMessage(what, 'null', message))
}

export function assertBoolean(what: any, message?: string): asserts what is boolean {
  assert(isBoolean(what), createMessage(what, 'a boolean', message))
}

export function assertNumber(what: any, message?: string): asserts what is number {
  assert(isNumber(what), createMessage(what, 'a number', message))
}

export function assertBigInt(what: any, message?: string): asserts what is bigint {
  assert(isBigInt(what), createMessage(what, 'a bigint', message))
}

export function assertString(what: any, message?: string): asserts what is string {
  assert(isString(what), createMessage(what, 'a string', message))
}

export function assertSymbol(what: any, message?: string): asserts what is symbol {
  assert(isSymbol(what), createMessage(what, 'a symbol', message))
}

export function assertFunction(what: any, message?: string): asserts what is Function {
  assert(isFunction(what), createMessage(what, 'a function', message))
}

export function assertObject(what: any, message?: string): asserts what is object {
  assert(isObject(what), createMessage(what, 'an object', message))
}

export function assertArray(what: any, message?: string): asserts what is any[] {
  assert(isArray(what), createMessage(what, 'an array', message))
}

/* ========================================================================== *
 * INSTANCE OF CHECKS AND ASSERTIONS                                          *
 * ========================================================================== */

export function isType<T>(what: any, type: Class<T>): what is T
export function isType<T extends keyof Type>(what: any, type: T): what is Type[T]

export function isType(what: any, type: any): boolean {
  if (typeof type === 'function') return what instanceof type

  switch (type) {
    case 'undefined': return isUndefined(what)
    case 'null': return isNull(what)
    case 'boolean': return isBoolean(what)
    case 'number': return isNumber(what)
    case 'bigint': return isBigInt(what)
    case 'string': return isString(what)
    case 'symbol': return isSymbol(what)
    case 'function': return isFunction(what)
    case 'object': return isObject(what)
    case 'array': return isArray(what)
  }

  const argument = typeof type === 'string' ? `"${type}"` : typeof type
  assert.fail(`Invalid type specified for check: ${argument}`)
}

/* ========================================================================== */

export function assertType<T>(what: any, type: Class<T>, message?: string): asserts what is T
export function assertType<T extends keyof Type>(what: any, type: T, message?: string): asserts what is Type[T]

export function assertType(what: any, type: any, message?: string) {
  if (typeof type === 'function') {
    assert(what instanceof type, createMessage(what, `an instance of "${type.name}"`, message))
    return
  }

  switch (type) {
    case 'undefined': assertUndefined(what, message); return
    case 'null': assertNull(what, message); return
    case 'boolean': assertBoolean(what, message); return
    case 'number': assertNumber(what, message); return
    case 'bigint': assertBigInt(what, message); return
    case 'string': assertString(what, message); return
    case 'symbol': assertSymbol(what, message); return
    case 'function': assertFunction(what, message); return
    case 'object': assertObject(what, message); return
    case 'array': assertArray(what, message); return
  }

  const argument = typeof type === 'string' ? `"${type}"` : typeof type
  assert.fail(`Invalid type specified for assertion: ${argument}`)
}

/* ========================================================================== *
 * NON EMPTY STRINGS AND ARRAYS                                               *
 * ========================================================================== */

export function isNonEmptyString(what: any): what is string {
  return (typeof what === 'string') && (what.length > 0)
}

export function assertNonEmptyString(what: any, message?: string): asserts what is string {
  assert(isNonEmptyString(what), createMessage(what, 'a non-empty string', message))
}

/* ========================================================================== */

export function isNonEmptyArray(what: any): what is NonEmptyArray<any> {
  return Array.isArray(what) && (what.length > 0)
}

export function assertNonEmptyArray(what: any, message?: string): asserts what is NonEmptyArray<any> {
  assert(isNonEmptyArray(what), createMessage(what, 'a non-empty array', message))
}

/* ========================================================================== *
 * ARRAY OF TYPES                                                             *
 * ========================================================================== */

export function isArrayOf<T>(what: any, type: Class<T>): what is T[]
export function isArrayOf<T extends keyof Type>(what: any, type: T): what is Type[T][]

export function isArrayOf(what: any, type: any): boolean {
  if (! isArray(what)) return false
  for (const item of what) {
    if (isType(item, type)) continue
    return false
  }
  return true
}

export function assertArrayOf<T>(what: any, type: Class<T>, message?: string): asserts what is T[]
export function assertArrayOf<T extends keyof Type>(what: any, type: T, message?: string): asserts what is Type[T][]

export function assertArrayOf(what: any, type: any, message?: string) {
  assertArray(what, message)

  what.forEach((item, index) => {
    try {
      assertType(item, type, message)
    } catch (error) {
      assert.fail(`${error.message} [index=${index}]`)
    }
  })
}

/* ========================================================================== */

export function isNonEmptyArrayOf<T>(what: any, type: Class<T>): what is NonEmptyArray<T>
export function isNonEmptyArrayOf<T extends keyof Type>(what: any, type: T): what is NonEmptyArray<Type[T]>

export function isNonEmptyArrayOf(what: any, type: any): boolean {
  return isNonEmptyArray(what) && isArrayOf(what, type)
}

export function assertNonEmptyArrayOf<T>(what: any, type: Class<T>, message?: string): asserts what is NonEmptyArray<T>
export function assertNonEmptyArrayOf<T extends keyof Type>(what: any, type: T, message?: string): asserts what is NonEmptyArray<Type[T]>

export function assertNonEmptyArrayOf(what: any, type: any, message?: string) {
  assertNonEmptyArray(what, message)
  assertArrayOf(what, type, message)
}

/* ========================================================================== *
 * SPECIFIC PLUG CHECKS AND ASSERTIONS                                        *
 * ========================================================================== */

export const isTask: Guard<Task> = classCheck(Task)

export const assertTask: Assertor<Task> = classAssertor(Task)

/* ========================================================================== */

export function isTaskCall(what: any): what is TaskCall {
  return typeof what === 'function'
}

export function assertTaskCall(what: any, message?: string): asserts what is TaskCall {
  assert(isFunction(what), createMessage(what, 'a "TaskCall" function', message))
}
