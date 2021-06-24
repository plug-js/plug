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
    items: IterableIterator<I> | Iterable<I> | readonly I[],
    callback: (item: I) => R | Promise<R>,
    thisArg?: any,
): Promise<R[]> {
  // This function is a bit "hairy" but as it's used pretty much everywhere
  // I took some time to shave off some nanoseconds (on Node 16x)

  // Allocate an array, reserve some space "reasonable" for a parallel
  // execution of a task... Let's say that (for example) 5000 files being
  // written is "reasonable".
  const promises = new Array<Promise<R>>(Array.isArray(items) ? items.length : 5000)
  let i = 0

  // Shove all our promises in the array, do not bind the callback (it's slow)
  // and do not use "Promise.resolve(item).then(...)", manually, is faster!
  for (const item of items) {
    promises[i++] = new Promise<R>((resolve, reject) => {
      try {
        resolve(callback.call(thisArg, item))
      } catch (error) {
        reject(error)
      }
    })
  }

  // Await for settlement of _all_ promises above (as per our contract to our
  // caller) then process the results one by one, throwin at the first exception
  return Promise.allSettled(promises).then((results) => {
    // We already know the size of the array to return
    const values: R[] = new Array(i)

    // Check each result for rejection and throw if one was found
    for (let j = 0, item = results[0]; j < i; item = results[++j]) {
      if ('reason' in item) throw item.reason
      values[j] = item.value
    }

    // We have all our results]
    return values
  })
}
