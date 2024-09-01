#!/usr/bin/env bash

cd packages;
ordered_packages=("jam-types" "jam-codec" "jam-crypto" "jam-safrole" "jam-work" "jam-merklization" "jam-recenthistory")
for package in "${ordered_packages[@]}"; do
  cd "$package"
  npm run build
  cd ..
done

