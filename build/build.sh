#!/usr/bin/env bash

cd packages;
ordered_packages=("jam-types")
for package in "${ordered_packages[@]}"; do
  cd "$package"
  npm run build
  cd ..
done
