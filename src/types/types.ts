/** A `Class` identifies a _function_ constructing objects */
export type Class<T> = (new (...args: any[]) => T)

/** A _non-empty-array_ of `<T>` elements */
export type NonEmptyArray<T> = [ T, ... T[] ]
