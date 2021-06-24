import { EOL } from 'os'

// Lifted from WebPack's "source-map-loader "
const innerRegex = /\s*[#@]\s*sourceMappingURL\s*=\s*([^\s'"]*)\s*/
const sourceMappingURLRegExp = RegExp(
    '(?:' +
    '/\\*' +
    '(?:\\s*\r?\n(?://)?)?' +
    '(?:' +
    innerRegex.source +
    ')' +
    '\\s*' +
    '\\*/' +
    '|' +
    '//(?:' +
    innerRegex.source +
    ')' +
    ')' +
    '\\s*',
)

/* ========================================================================== *
 * EXPORTED FUNCTIONS                                                         *
 * ========================================================================== */

// Internal types for sanity...
type ExtractedSourceMappingURL = { contents: string, url?: string }

/**
 * Extract the source mapping URL from a chunk of code, optionally wiping it.
 *
 * @param contents The code where the source mapping URL is located.
 * @param wipe Whether to wipe the URL from the source or not.
 */
export function extractSourceMappingURL(contents: string, wipe: boolean): ExtractedSourceMappingURL {
  // Split the code into lines
  const lines = contents.split(/^/m)

  // Match the _last_ source mapping URL
  let match
  for (let i = lines.length - 1; i >= 0; i--) {
    match = lines[i].match(sourceMappingURLRegExp)
    if (match) {
      break
    }
  }

  // No match? No URL!
  if (! match) return { contents }

  // Sanitize the URL (we have to have something)
  const url = (match[1] || match[2] || '').trim()
  if (! url) return { contents }

  // If we don't have to wipe, we're done here
  if (! wipe) return { contents, url }

  // Wipe the sourceMappingURL preserving line numbers
  const newlines = match[0].match(new RegExp(EOL, 'gm'))?.length
  const replacement = EOL.repeat(newlines || 0)
  return { contents: contents.replace(match[0], replacement), url }
}
