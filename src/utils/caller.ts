import path from 'path'
import support from 'source-map-support'

const start = path.resolve(__dirname, '..') + path.sep

// This is a bit of a _hairy_ function... We use V8's internal stack traces
// processing and sourcemap to get the original source file, line and column.
export function findCaller(): string {
  // Save the old "prepareStackTrace", likely from "source-map-support"
  const prepare = Error.prepareStackTrace
  try {
    // Inject our new "prepareStackTrace"
    Error.prepareStackTrace = (err, traces) => {
      for (const trace of traces) {
        const source = trace.getFileName()
        // The first location outside of this directory tree is the one matching
        if (source && (! source.startsWith(start))) {
          // Use "sourceMapSupport" to map the optionally source-mapped position
          const { source: file, line, column } = support.mapSourcePosition({
            line: trace.getLineNumber() || /* istanbul ignore next */ -1,
            column: trace.getColumnNumber() || /* istanbul ignore next */ -1,
            source,
          })
          // Done, return something compatible with TaskLocation
          const relative = path.relative(process.cwd(), file)
          const resolved = relative.startsWith('..') ? /* istanbul ignore next */ file : relative
          return `${resolved}:${line}:${column}`
        }
      }
    }

    // Create a new stack and return what we got above
    return new Error().stack || /* istanbul ignore next */ '<unknown>'
  } finally {
    // Always restore the old "prepareStackTrace" call
    Error.prepareStackTrace = prepare
  }
}
