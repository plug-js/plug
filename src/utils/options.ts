export type ParsedOptions<Options> = { globs: string[], options: Options }
export type ParsedOptionalOptions<Options> = ParsedOptions<Options | undefined>
export type ParseOptions<Options> = [ string, ...string[] ] | [ string, ...string[], Options ]

/** Parse an array of at least one string, followed by an optional `Options` argument. */
export function parseOptions<Options>(args: ParseOptions<Options>): ParsedOptionalOptions<Options>
/** Parse an array of at least one string, followed by an optional `Options` argument. */
export function parseOptions<Options>(args: ParseOptions<Options>, defaults?: undefined): ParsedOptionalOptions<Options>
/** Parse an array of at least one string, followed by an optional `Options` argument, ensuring some defaults are present. */
export function parseOptions<Options, Defaults extends Options>(args: ParseOptions<Options>, defaults: Defaults): ParsedOptions<Options & Defaults>
// overloaded implementation
export function parseOptions<Options, Defaults extends Options>(args: ParseOptions<Options>, defaults?: Defaults): ParsedOptions<Options | Defaults | undefined> {
  const last = args.splice(-1)[0]

  const { globs, options } =
    typeof last === 'string' ? {
      globs: [ ...args as string[], last ],
      options: defaults,
    } : defaults ? {
      globs: [ ...args as string[] ],
      options: { ...defaults, ...last },
    } : {
      globs: [ ...args as string[] ],
      options: last,
    }

  return { globs, options }
}
