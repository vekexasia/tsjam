![CI](https://img.shields.io/github/actions/workflow/status/vekexasia/tsjam/on_push.yaml?style=for-the-badge)
 ![Apache 2.0](https://img.shields.io/github/license/vekexasia/tsjam?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
# TSJam a TypeScript implementation of JAM

This repository contains a Typescript implementation of the JAM protocol.

# Structure

This is a MonoRepo using Turbo, inside the `packages` folder you could find the following:

 - `jam-types`: just types defining extrinsics, block, header and various set types
 - `jam-codec`: contains all the codec functions that are expressed in Appendix C
 - `jam-crypto-napi`: contains native bindings to cryptography elements used in jam such as bandersnatch and ed25519
 - `jam-crypto`: a consumer of `jam-crypto-napi` that also imports other cryptography libraries used in Jam such as Blake2b.
 - `jam-constants`: constants
 - `jam-erasurecoding`
 - `jam-np`: network protocol
 - `jam-pvm-base`: base types/interfaces for the pvm
 - `jam-pvm-js`: TS/JS impl of the PVM 
 - `jam-pvm-wasm`: (exploration) AssemblyScript impl of the PVM (cur status: untested and probably not working)
 - `jam-utils`: some basic utils used by most of the other packages
 - `jam-core`: the main logic implementation
 - `jam-fuzzer-target`: target of the fuzzer

Other than the packages themselves, there are other folders mainly tracking submodules such as the conformance and testvectors used when checking the correctness of the implementation.

# Building

The `build` folder contain some utilities to avoid code duplication and create the deliverable that is being currently packaged using `nexe`. The most up-to-date code to build this project is inside the CI pipeline code within the `.github` folder.

# LICENSE

This project is under the Apache 2.0 license. See the [LICENSE](./LICENSE) for tdetails.

# Addresses

Polkadot: 15QJw5Wijjr4L4He51wwmsyLT3dpMsqHEoAKZAWTZvqapdt4
Kusama: DEq1QVjwKFFZZ42PdYRN46CkpA8zVA8tDyJhZfTwcuEwo9H

