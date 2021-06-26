// import type { FilterOptions } from '../types/globs'
// import type { Log } from '../utils/log'
// import type { MochaOptions as Options } from 'mocha'
// import type { Plug } from '../pipe'
// import type { Run } from '../run'

// import { Files } from '../files'
// import { install } from '../pipe'
// import { FilterPlug } from './filter'

// import Mocha from 'mocha'
// import { parseGlobOptions } from '../utils/globs'
// import { Failure } from '../failure'
// import { SourceMapsPlug } from './sourcemaps'
// import { FilePath } from '../utils/paths'
// import { setupLoader } from '../utils/loader'

// declare module '../pipe' {
//   interface Pipe<P extends Pipe<P>> {
//     mocha: PlugExtension<P, typeof MochaPlug>
//   }
// }

// interface MochaOptions extends FilterOptions, Options {
//   matchOriginalPaths?: boolean,
//   require?: string | string[],
//   reporter?: string,
// }

// type MochaArguments = [ string, ...string[], MochaOptions ] | [ string, ...string[] ]

// class NullReporter extends Mocha.reporters.Base {
//   constructor(runner: Mocha.Runner, options?: Options) {
//     super(runner, options)
//   }
// }

// export class MochaPlug extends FilterPlug<MochaOptions> implements Plug {
//   constructor(...args: MochaArguments) {
//     const { globs, options = {} } = parseGlobOptions(args)
//     super(...globs, options)

//     if (this.options!.matchOriginalPaths === undefined) {
//       this.options!.matchOriginalPaths = true
//     }
//     if (this.options!.reporter === 'null') {
//       this.options!.reporter = NullReporter as any
//     }
//   }

//   async process(zxinput: Files, run: Run, log: Log): Promise<Files> {
//     const time = log.start()
//     const mocha = new Mocha(this.options)

//     const input = new Files(zxinput)
//     for (const file of zxinput) {
//       if (file.absolutePath.endsWith('.d.ts')) continue
//       input.add(file)
//     }

//     const files = this.filter(input, this.options!.matchOriginalPaths)
//     if (! files.length) throw new Failure('No test files found')

//     for (const file of files) {
//       log.trace(`Mocha testing with "${file.absolutePath}"`)
//       mocha.addFile(file.absolutePath)
//     }

//     const loadables = await new SourceMapsPlug({ sourceMaps: 'inline' }).process(input, run, log)
//     const sources = loadables.list().reduce((map, file) =>
//       map.set(file.absolutePath, file.contentsSync()), new Map<FilePath, string>())
//     setupLoader(sources)

//     const failures = await new Promise<number>((resolve, reject) => {
//       try {
//         mocha.run((failures) => resolve(failures))
//       } catch (error) {
//         reject(error)
//       }
//     })

//     if (failures) throw new Failure(`Mocha detected ${failures} test ${failures > 1 ? 'failures' : 'failure'}`)
//     log.debug('Mocha processed', files.length, 'test files in', time)
//     return input
//   }
// }

// export const mocha = install('mocha', MochaPlug)
