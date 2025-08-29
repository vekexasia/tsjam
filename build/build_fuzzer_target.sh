#!/bin/bash

yarn build; 
cp ./packages/jam-fuzzer-target/dist/cli.mjs ./build/tsjam-fuzzer-target/
cd ./build/tsjam-fuzzer-target/
rm -rf node_modules
yarn install 
yarn build:deliverable
cd ..

FILENAME=tsjam-fuzzer-target.tgz
#find ./fuzzer-target-package -type f | egrep 'bigint-buffer|sodium-native|tsjam|jam-fuzzer-target' | \
find ./tsjam-fuzzer-target -type f | egrep '(node_modules)|(jam-fuzzer-target$)' | \
				tar -czf $FILENAME --files-from=-
mv $FILENAME ../
