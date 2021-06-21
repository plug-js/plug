import { directory } from './support'
import { expect } from 'chai'
import { glob } from '../src/utils/globs'

describe('Virtual File List Globs', () => {
  it('should prepare a virtual file list from some globs', async () => {
    const files: string[] = []
    await glob(directory, [ '*' ], {}, (path) => void files.push(path))

    expect(files).to.have.length.greaterThan(1)
    expect(files).to.include('build.ts')
  })

  it('should prepare a virtual file list from some globs and options', async () => {
    const files: string[] = []
    await glob(directory, [ '*' ], { ignore: [ '*.ts' ] }, (path) => void files.push(path))

    expect(files).to.have.length.greaterThan(1)
    expect(files).not.to.include('build.ts')
  })

  it('should fail when callback fails', async () => {
    const promise = glob(directory, [ '*' ], { ignore: [ '*.ts' ] }, () => {
      throw new Error('Foobar!')
    })

    await expect(promise).to.be.rejectedWith(Error, 'Foobar!')
  })
})
