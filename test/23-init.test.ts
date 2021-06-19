import { expect } from 'chai'
import { pipe, read, from } from '../src/init'
import { Files } from '../src/files'
import { PlugPipe, TaskPipe } from '../src/pipe'
import { getProjectDirectory, setProjectDirectory } from '../src/project'
import { directory } from './support'

describe('Plug Initialization', () => {
  it('should create a PlugPipe', async () => {
    const pipeline = pipe()
    expect(pipeline).to.be.instanceof(PlugPipe)

    const files = new Files('/foo')
    expect(await pipeline.process(files, null as any)).to.equal(files)
  })

  it('should create a TaskPipe with "read"', async () => {
    const old = getProjectDirectory()
    setProjectDirectory(directory)

    try {
      const pipeline1 = read('**/*.ts')
      expect(pipeline1).to.be.instanceof(TaskPipe)

      const output1 = await pipeline1.run(null as any)
      const files1 = output1.list().map((file) => file.relativePath)
      expect(files1).to.have.length.greaterThan(1)
      expect(files1).to.include('build.ts')

      const pipeline2 = read('**/*.*', { ignore: [ '**/*.ts' ] })
      expect(pipeline2).to.be.instanceof(TaskPipe)

      const output2 = await pipeline2.run(null as any)
      const files2 = output2.list().map((file) => file.relativePath)
      expect(files2).to.have.length.greaterThan(1)
      expect(files2).to.not.include('build.ts')
    } finally {
      setProjectDirectory(old)
    }
  })

  it('should create a TaskPipe with "from"', async () => {
    const pipeline1 = from(directory).read('**/*.ts')
    expect(pipeline1).to.be.instanceof(TaskPipe)

    const output1 = await pipeline1.run(null as any)
    const files1 = output1.list().map((file) => file.relativePath)
    expect(files1).to.have.length.greaterThan(1)
    expect(files1).to.include('build.ts')

    const pipeline2 = from(directory).read('**/*.*', { ignore: [ '**/*.ts' ] })
    expect(pipeline2).to.be.instanceof(TaskPipe)

    const output2 = await pipeline2.run(null as any)
    const files2 = output2.list().map((file) => file.relativePath)
    expect(files2).to.have.length.greaterThan(1)
    expect(files2).to.not.include('build.ts')
  })
})
