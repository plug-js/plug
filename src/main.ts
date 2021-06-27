import modules from 'module'
import yargs from 'yargs'

import { BASE, STYLE, RESET } from './utils/colors'
import { createDirectoryPath, createFilePath, getCurrentDirectory, getRelativePath } from './utils/paths'
import { loadProject } from './loader'
import { log, LogLevel, logOptions } from './utils/log'
import { spawnSync } from 'child_process'

import type { DirectoryPath, FilePath } from './utils/paths'
import type { Project } from './project'

/* ========================================================================== *
 * LOAD PROJECT SILENTLY                                                      *
 * ========================================================================== */

async function loadSilentProject(file: FilePath, directory?: DirectoryPath): Promise<Project> {
  const oldLevel = logOptions.level
  if (logOptions.level === LogLevel.PLAIN) logOptions.level = LogLevel.ALERT
  try {
    return await loadProject(file, directory)
  } finally {
    logOptions.level = oldLevel
  }
}

/* ========================================================================== *
 * SHOW PROJECT TASKS                                                         *
 * ========================================================================== */

async function showTasks(file: FilePath, directory?: DirectoryPath | undefined): Promise<void> {
  const project = await loadSilentProject(file, directory)

  const tasks = project.getTaskNames().sort()
  const length = tasks.reduce((l, n) => n.length > l ? n.length : l, 0)
  const descriptions = project.getTaskDescriptions()

  const relative = getRelativePath(getCurrentDirectory(), file)

  log.write('')
  if (log.colors) {
    log.write(`Tasks for ${BASE.Y}${STYLE.UNDERLINE}${relative}${RESET}:`)
    log.write('')
    for (const task of tasks) {
      log.write([
        `${STYLE.FAINT}*${RESET}`,
        `${BASE.G}${task.padEnd(length, ' ')}${RESET}`,
        `${STYLE.FAINT}-${RESET}`,
        `${descriptions[task] || ''}`,
      ].join(' '))
    }
  } else {
    log.write(`Tasks for "${relative}"`)
    log.write('')
    for (const task of tasks) {
      log.write(`* ${task.padEnd(length, ' ')} - ${descriptions[task] || ''}`)
    }
  }
  log.write('')
}

/* ========================================================================== *
 * A-SYNCHRONOUS MAIN                                                         *
 * ========================================================================== */

async function main(): Promise<void> {
  const options = await yargs
      .usage('Plug Usage:\n  $0 [--options ...] [task ...]')

      // Project settings
      .option('file', { alias: 'f' })
      .describe('file', 'The project file to use instead of the default')
      .default('file', 'plugfile.ts')
      .group('file', 'Project:')

      .option('directory', { alias: 'd' })
      .describe('directory', 'The base directory of the project')
      .default('directory', undefined as string | undefined, 'the directory of the build file')
      .group('directory', 'Project:')

      .option('tasks', { alias: 't', type: 'boolean' })
      .describe('tasks', 'Only list the project\'s own tasks without executing them')
      .default('tasks', undefined as true | undefined)
      .group('tasks', 'Project:')

      // Logging
      .option('verbose', { conflicts: 'quiet', alias: 'v', type: 'count', default: undefined })
      .option('quiet', { conflicts: 'verbose', alias: 'q', type: 'count', default: undefined })
      .describe('v', 'Increase logging level')
      .describe('q', 'Decrease logging level')
      .group('v', 'Logging:')
      .group('q', 'Logging:')

      // Others
      .version('version').alias('version', 'V').group('help', 'Other Options:')
      .help('help').alias('help', 'h').group('version', 'Other Options:')

      // Epilogue
      .epilogue('When run without specifying any task, the "default" task will be executed')

      // Finish up
      .strict()
      .argv

  // Log level
  const level = logOptions.level + (options.quiet || 0) - (options.verbose || 0)
  logOptions.level =
    level < LogLevel.TRACE ? LogLevel.TRACE :
    level > LogLevel.QUIET ? LogLevel.QUIET :
    level

  // Our directory and build file
  const fileName = options.file || 'plugfile.ts'
  const file = createFilePath(getCurrentDirectory(), fileName)

  const directory = options.directory ?
      createDirectoryPath(getCurrentDirectory(), options.directory) :
      undefined

  // If we only have to show tasks, then let's show them
  if (options.tasks) return showTasks(file, directory)

  // The taks to run (if none specified, run "default")
  const tasks = options._.map((value) => value.toString())
  if (tasks.length === 0) tasks.push('default')

  // Load the project and run the tasks in series
  const project = await loadSilentProject(file, directory)
  for (const task of tasks) await project.runTask(task)
}

/* ========================================================================== *
 * SYNCHRONOUS MAIN                                                           *
 * ========================================================================== */

// Check what's the status of source maps
const enableSourceMaps = '--enable-source-maps'
const haveSourceMap = !! modules.findSourceMap(__filename)
const sourceMapsEnabled = process.execArgv.indexOf(enableSourceMaps) >= 0
const sourceMapsUnavailable = ! process.allowedNodeEnvironmentFlags.has(enableSourceMaps)

// Debug a buit the status of this process (use LOG_LEVEL to see this...)
log.debug('Running in PID', process.pid, {
  haveSourceMap,
  sourceMapsEnabled,
  sourceMapsUnavailable,
})

// If we have our source map, or source maps are enabled, or if (worse case
// scenario) source maps can not be enabled in node, then simply run...
if (haveSourceMap || sourceMapsEnabled || sourceMapsUnavailable) {
  log.debug('Executing with arguments', process.argv.slice(2))
  main().catch((error) => {
    log.error(error)
    process.exitCode = 1
  })
} else {
  // We can fork to enable source maps... Let's do it!
  const args = [
    enableSourceMaps, // enable source maps
    ...process.execArgv, // any other command line for node
    __filename, // we lounch ourselves again, so same file to pass to node
    ...process.argv.slice(2), // include any other command line option
  ]

  // Do the real forking, synchronous
  log.debug('Forking to enable source maps', [ process.execPath, ...args ])
  const child = spawnSync(process.execPath, args, {
    cwd: process.cwd(), // same directory as we're running
    stdio: 'inherit', // inherit standard input/output/error
  })

  // Set the process exit code to the same of the child
  process.exitCode = child.status || 1
}
