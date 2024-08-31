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
ordered_packages=("jam-types" "jam-codec" "jam-crypto" "jam-safrole" "jam-work" "jam-merklization" "jam-recenthistory")

for package in "${ordered_packages[@]}"; do
  cd "$package"
  npm run build -- --watch --watch.onEnd "echo $package" &
  pids+=($!)
  sleep 3
  cd ..
done

for pid in "${pids[@]}"; do
    wait $pid
done
