export type ParsedOptions<O> = { strings: string[], options?: O }
export type ParseOptions<O> = string[] | [ ...string[], O ]

/**
 * Parse an array of at least one string, followed by an optional `Options`
 * argument.
 */
export function parseOptions<Options>(
    args: ParseOptions<Options>,
): ParsedOptions<Options> {
  const last = args.splice(-1)[0]

  const { patterns: strings, options } = typeof last === 'string' ? {
    patterns: [ ...args as string[], last ],
    options: undefined,
  } : {
    patterns: [ ...args as string[] ],
    options: last,
  }

  return { strings, options }
}
