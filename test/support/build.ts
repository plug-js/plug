// THIS IS A HACK! We don't (yet) have our code in the require path, and if
// we were to "import { task, from, read } from '../../src/index'" we would
// be recompiling the entire code base in a test. So we just export "something"
// that _looks_ like a task, but that is not _really_ a Task :-)

// we import this to make sure we can resolve modules
import fg from 'fast-glob'

function call() {} // our "TaskCall", normally would return a "TaskPipe"
call.task = { // our fake "Task", simply a description and a function
  description: '... the default ...', // the task description for the project
  run: fg, // fast-glob is conveniently a function, we can use it for "run"
}

// our default export for the project
export default call
