#![deny(clippy::all)]

use ark_ec_vrfs::suites::bandersnatch::edwards as bandersnatch;
use ark_ec_vrfs::prelude::ark_serialize;
use ark_serialize::{CanonicalDeserialize, CanonicalSerialize};
use bandersnatch::{IetfProof, Output, RingProof};
use std::convert::TryInto;
#[macro_use]
extern crate napi_derive;


// This is the IETF `Prove` procedure output as described in section 2.2
// of the Bandersnatch VRFs specification
#[derive(CanonicalSerialize, CanonicalDeserialize)]
struct IetfVrfSignature {
    output: Output,
    proof: IetfProof,
}

// This is the IETF `Prove` procedure output as described in section 4.2
// of the Bandersnatch VRFs specification
#[derive(CanonicalSerialize, CanonicalDeserialize)]
struct RingVrfSignature {
    output: Output,
    // This contains both the Pedersen proof and actual ring proof.
    proof: RingProof,
}

#[napi]
pub fn sum(a: i32, b: i32) -> i32 {
  a + b
}

#[napi]
pub fn greet() -> String {
  "Hello, World!".to_string()
}
#[napi]
pub fn vrfoutput(input: &[u8]) -> [u8;32] {
    // let signature = RingVrfSignature::deserialize_compressed(input).unwrap();
    // let output = signature.output;
    //
    // let vrf_output_hash: [u8;32] = output.hash()[..32].try_into().unwrap();
    //
    // vrf_output_hash
    input.try_into().unwrap()
}
