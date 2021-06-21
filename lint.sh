#!/bin/bash

./node_modules/.bin/eslint 'src/**/*.ts' 'test/**/*.ts' "${@}"
