#!/bin/bash

yarn build --force; 
cp ./packages/jam-fuzzer-target/dist/cli.mjs ./build/tsjam-fuzzer-target/
cd ./build/tsjam-fuzzer-target/
touch yarn.lock
rm -rf node_modules
yarn install --no-immutable && yarn build:deliverable
cd ..

FILENAME=tsjam-fuzzer-target.tgz
#find ./fuzzer-target-package -type f | egrep 'bigint-buffer|sodium-native|tsjam|jam-fuzzer-target' | \
find ./tsjam-fuzzer-target -type f | egrep '(node_modules)|(jam-fuzzer-target$|jam-fuzzer-target-node$)' | \
tar -czf $FILENAME --files-from=-
mv $FILENAME ../
