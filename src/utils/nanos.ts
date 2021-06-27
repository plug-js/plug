export function nanos(nanos: bigint): [ number, string ][] {
  const micros = Number(nanos / 1000n)
  const millis = micros / 1000
  if (millis < 1000) return [ [ millis, 'ms' ] ]

  const seconds = Math.floor(millis) / 1000
  if (seconds < 60) return [ [ seconds, 'sec' ] ]

  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(millis % 60000) / 1000
  return [ [ minutes, 'min' ], [ secs, 'sec' ] ]
}
