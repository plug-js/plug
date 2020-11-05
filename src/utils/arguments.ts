import assert from 'assert'
import { Guard } from '../types'

// Define "OptionKey" as any key besides "name" or "description"
type OptionKey<T> = Exclude<keyof T, 'name' | 'description'>

// Our "Options" defines an object with any property of "T" (besides "name" or
// "description") marked as optional, and ensures "name" and "description" are
// optional strings
type Options<T> = { [P in OptionKey<T>]?: T[P] } & {
  name?: string,
  description?: string,
}

/**
 * Parse an array of arguments into an options hash.
 *
 * By arguments here we define our usual `name`, `description`, `...` used
 * to construct tasks either in the `Task` constructors or by `Plug`
 *
 * @param key The `key` of the extra argument (e.g. `task` or `subtasks`)
 * @param check A check to employ
 * @param args
 */
export function parseArguments<T>(
  key: OptionKey<T>,
  check: Guard<T[OptionKey<T>]>,
  args: (string | T[OptionKey<T>] | T)[]
): Options<T> {
  const options: Options<T> = {}

  // Basics: if no arguments, we return the empty Options<T> above
  if (args.length === 0) return options

  // If we have only one arguments, what we have is either our needle in the
  // haystack, or an options hash... we employ a check to make sure we determine
  // the right result
  if (args.length === 1) {
    const arg = args[0]

    if (check(arg)) {
      options[key] = arg
      return options
    } else if (typeof arg !== 'string') {
      return arg
    }
  }

  // We have an array of 1 string or more than 1 element...
  const last = args[args.length - 1]

  // Check the last element, if it's what we found, assign and pop
  if (check(last)) {
    options[key] = last
    args.pop()
  }

  // Check the remaining arguments, should only be name, description strings
  assert(args.length < 3, `Too many arguments (max: 2, was: ${args.length})`)

  // Name and description checks
  const [ name, description ] = args
  assert((typeof name === 'string') || (typeof name === 'undefined'), `Invalid type for "name": ${typeof name}`)
  assert((typeof description === 'string') || (typeof description === 'undefined'), `Invalid type for "description": ${typeof description}`)

  // Assign name and descriptor then return
  options.name = name
  options.description = description
  return options
}
