#!/bin/bash

export PATH=$(dirname $0)/node_modules/.bin:${PATH}

tsc --build bootstrap.json
node ./build/src/typescript/loader.js
