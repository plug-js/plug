#!/bin/sh

./node_modules/.bin/nodemon -e ts -w src -w test -x ./bootstrap.sh
