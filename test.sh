#!/bin/bash

export PATH=$(dirname $0)/node_modules/.bin:${PATH}

rm -rf bootstrap
tsc --build bootstrap.json || exit 1
nyc mocha --file 'bootstrap/test/.setup.js' 'bootstrap/test/**/*.test.js'
# ./test.js
