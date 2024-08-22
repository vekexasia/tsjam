#!/usr/bin/env bash

cd packages;
ordered_packages=("jam-types" "jam-codec" "jam-crypto" "jam-pvm" "jam-safrole")
for package in "${ordered_packages[@]}"; do
  cd "$package"
  npm run build
  cd ..
done

