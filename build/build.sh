#!/usr/bin/env bash

cd packages;
ordered_packages=("jam-types" "jam-codec")
for package in "${ordered_packages[@]}"; do
  cd "$package"
  npm run build
  cd ..
done
