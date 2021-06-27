#!/bin/bash

nodemon -e ts,js -w src -w test -i test/support -x ./test.sh
