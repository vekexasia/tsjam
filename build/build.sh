#!/usr/bin/env bash

pids=()
cleanup() {
    for pid in "${pids[@]}"; do
        kill $pid
    done
    exit 0
}

trap cleanup SIGINT SIGTERM

cd packages;
ordered_packages=("jam-types" "jam-codec" "jam-crypto" "jam-pvm" "jam-safrole")
for package in "${ordered_packages[@]}"; do
  cd "$package"
  npm run build
  cd ..
done

