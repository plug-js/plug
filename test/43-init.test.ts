import { expect } from 'chai'
import { PlugPipe, TaskPipe } from '../src/pipe'
import { directory, mock } from './support'
import { from, pipe, read } from '../src/init'

describe('Plug Initialization', () => {
  it('should create a PlugPipe', async () => {
    const pipeline = pipe()
    expect(pipeline).to.be.instanceof(PlugPipe)

    const { files } = mock('/foo')
    expect(await pipeline.process(files, null as any)).to.equal(files)
  })

  it('should create a TaskPipe with "read"', async () => {
    const pipeline1 = read('**/*.ts')
    expect(pipeline1).to.be.instanceof(TaskPipe)

    const output1 = await pipeline1.run(mock(directory).run)
    const files1 = output1.list().map((file) => file.absolutePath)
    expect(files1).to.have.length.greaterThan(1)
    expect(files1).to.include(`${directory}/build.ts`)

    const pipeline2 = read('**/*.*', { ignore: [ '**/*.ts' ] })
    expect(pipeline2).to.be.instanceof(TaskPipe)

    const output2 = await pipeline2.run(mock(directory).run)
    const files2 = output2.list().map((file) => file.absolutePath)
    expect(files2).to.have.length.greaterThan(1)
    expect(files1).to.include(`${directory}/build.ts`)
  })

  it('should create a TaskPipe with "from"', async () => {
    const pipeline1 = from(directory).read('**/*.ts')
    expect(pipeline1).to.be.instanceof(TaskPipe)

    const output1 = await pipeline1.run(mock(directory).run)
    const files1 = output1.list().map((file) => file.absolutePath)
    expect(files1).to.have.length.greaterThan(1)
    expect(files1).to.include(`${directory}/build.ts`)

    const pipeline2 = from(directory).read('**/*.*', { ignore: [ '**/*.ts' ] })
    expect(pipeline2).to.be.instanceof(TaskPipe)

    const output2 = await pipeline2.run(mock(directory).run)
    const files2 = output2.list().map((file) => file.absolutePath)
    expect(files2).to.have.length.greaterThan(1)
    expect(files1).to.include(`${directory}/build.ts`)
  })
})
