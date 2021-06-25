#!/usr/bin/env node
/* eslint-disable strict */

process.env.LOG_LEVEL = 'trace'

const { load } = require('./bootstrap/src/project')
load(process.cwd() + '/plugfile.ts')
    .then((project) => {
      console.log(project, project.getTaskNames())
      return project.runTask('compile')
    })
    .catch((error) => {
      if (typeof error.report === 'function') {
        console.log(error.report(true))
      }
      console.log(error)
      process.exitCode = 1
    })
