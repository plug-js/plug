import { expect } from 'chai'
import { parallelize } from '../src/utils/parallelize'

describe('Call Parallelization', () => {
  it('should resolve parallelize and resolve all calls', async () => {
    const numbers = [ 1, 2, 3, 4 ]
    const calls: string[] = []
    const result = await parallelize(numbers, async (number) => {
      calls.push(`A${number}`)
      await new Promise((resolve) => setTimeout(resolve, number))
      calls.push(`B${number}`)
      return number
    })
    expect(result).to.eql([ 1, 2, 3, 4 ])
    expect(calls).to.eql([ 'A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'B4' ])
  })

  it('should fail when one call fails', async () => {
    const numbers = [ 1, 2, 3, 4 ]
    const calls: string[] = []
    const promise = parallelize(numbers, async (number) => {
      calls.push(`A${number}`)
      await new Promise((resolve) => setTimeout(resolve, number))
      if (number === 3) throw new Error(`Error ${number}`)
      calls.push(`B${number}`)
      return number
    })
    await expect(promise).to.be.rejectedWith(Error, 'Error 3')
    expect(calls).to.eql([ 'A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B4' ])
  })

  it('should fail when multiple calls fails', async () => {
    const numbers = [ 1, 2, 3, 4 ]
    const calls: string[] = []
    const promise = parallelize(numbers, async (number) => {
      calls.push(`A${number}`)
      if (number === 4) throw new Error(`Error ${number}`)
      await new Promise((resolve) => setTimeout(resolve, number))
      if (number === 2) throw new Error(`Error ${number}`)
      calls.push(`B${number}`)
      return number
    })
    // rejected with the promise failing later, but first in the order
    await expect(promise).to.be.rejectedWith(Error, 'Error 2')
    expect(calls).to.eql([ 'A1', 'A2', 'A3', 'A4', 'B1', 'B3' ])
  })
})
