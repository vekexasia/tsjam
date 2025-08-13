#!/bin/bash

# download zip from repo git@github.com:davxy/jam-conformance.git and extract fixtures
#

curl -L https://github.com/davxy/jam-conformance/archive/refs/heads/main.zip -o jam-conformance.zip
unzip jam-conformance.zip
rm -rf test/fixtures
mv jam-conformance-main/fuzz-proto/examples test/fixtures
rm -rf jam-conformance.zip jam-conformance-main
