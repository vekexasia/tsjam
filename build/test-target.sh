#!/bin/bash

# Run fuzzer target over all traces and report failures.
# Exit with 1 if any invocation returns a non-zero status.

set -u

TRACES_DIR="./jam-conformance/fuzz-reports/0.7.0/traces"

if [[ ! -d "$TRACES_DIR" ]]; then
  echo "Traces directory not found: $TRACES_DIR" >&2
  exit 1
fi

fail=0

for trace_path in "$TRACES_DIR"/*; do
  # Handle empty directory
  [[ -e "$trace_path" ]] || { echo "No traces found in $TRACES_DIR"; break; }
  # skip trace 1756548916 

  trace_name="$(basename "$trace_path")"
  if [[ "$trace_name" == "1756548916" ]]; then
    echo "Skipping trace $trace_name"
    continue
  fi
  echo ""
  echo ""
  echo "$trace_name"

  if ! TRACE_PATH="$(pwd)/$trace_path" JAM_CONSTANTS=tiny \
    node packages/jam-fuzzer/dist/node.esm.mjs; then
    echo "Failed: $trace_name" >&2
    fail=1
  fi
done
echo "Failure !=0 ? => $fail"
exit $fail
