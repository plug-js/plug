/**
 * Parallelize the exection of a given callback, and return a combined
 * promise to all results.
 *
 * Compared to `Promise.all(...)` this function will await for the settlement
 * of _all_ callback promises before returning.
 *
 * As with `Promise.all(...)` if any of the callbacks fail, the returned
 * promise will be rejected.
 */
export function parallelize<I, R>(
    items: IterableIterator<I> | readonly I[],
    callback: (item: I) => R | Promise<R>,
    thisArg?: any,
): Promise<R[]> {
  const promises: Promise<R>[] = []
  const resolve = callback.bind(thisArg)

  for (const item of items) promises.push(Promise.resolve(item).then(resolve))

  return Promise.allSettled(promises).then(() => Promise.all(promises))
}
