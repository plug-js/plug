import assert from 'assert'

/**
 * A _non-empty-array_ of `<T>` elements.
 */
export type NonEmptyArray<T> = [ T, ... T[] ]

/**
 * Asserts that the specified array is _non-empty_.
 *
 * @param array - The array to check
 * @param message - An optional message used to construct the assertion error
 */
export function assertNonEmptyArray<T>(array: T [], message?: string): asserts array is NonEmptyArray<T> {
  assert.notStrictEqual(array.length, 0, message || 'Array is empty')
}

/**
 * Checks that the specified array is _non-empty_.
 *
 * @param array - The array to check
 */
export function isNonEmptyArray<T>(array: T []): array is NonEmptyArray<T> {
  return array.length > 0
}

/**
 * Asserts that the specified string is _non-empty_.
 *
 * @param string - The string to check
 * @param message - An optional message used to construct the assertion error
 */
export function assertNonEmptyString(string: any, message?: string): asserts string is string {
  assert.strictEqual(typeof string, 'string', message ? message + ` [${typeof string}]`: `Not a string [${typeof string}]`)
  assert.notStrictEqual(string.length, 0, message ? message + ' [empty]' : 'String is empty')
}

/**
 * Checks that the specified string is _non-empty_.
 *
 * @param string - The string to check
 */
export function isNonEmptyString(string: any): string is string {
  return (typeof string === 'string') && (string.length > 0)
}
