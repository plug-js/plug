/** A `Class` identifies a _function_ constructing objects */
export type Class<T> = (new (...args: any[]) => T)

/** A _non-empty-array_ of `<T>` elements */
export type NonEmptyArray<T> = [ T, ... T[] ]

/** A _guard_ checking for the type of an argument */
export type Guard<T> = (what: any) => what is T

/** A _assertor_ ensuring the type of an argument */
export type Assertor<T> = (what: any, message?: string) => asserts what is T
