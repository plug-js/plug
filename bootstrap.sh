#!/bin/bash

export PATH=$(dirname $0)/node_modules/.bin:${PATH}

rm -rf build
tsc --build bootstrap.json

nyc mocha --file 'build/test/.setup.js' 'build/test/**/*.test.js'
