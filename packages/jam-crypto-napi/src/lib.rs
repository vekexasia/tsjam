#![deny(clippy::all)]

mod ar;
use ark_ec_vrfs::suites::bandersnatch::edwards as bandersnatch;
use ark_ec_vrfs::{prelude::ark_serialize, suites::bandersnatch::edwards::RingContext};
use ark_serialize::{CanonicalDeserialize, CanonicalSerialize};
use bandersnatch::{IetfProof, Output, RingProof};
use std::convert::TryInto;
use ark_ec_vrfs::suites::bandersnatch::edwards::Public;
use napi::bindgen_prelude::Buffer;


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
#[napi]
pub fn ring_root(input: &[u8])-> Vec<u8> {
    let mut ring : Vec<Public> = Vec::new();

    // have u8 checked to be 32 in length and have each chunk inserted into the ring
    input.chunks_exact(32).try_for_each(|c| {
        let pk = Public::deserialize_compressed(c).unwrap();
        ring.push(pk);
        Ok::<(),()>(())
    }).unwrap();


    let pts: Vec<_> = ring.iter().map(|pk| pk.0).collect();
    let verifier_key = ring_context(input.len() / 32).verifier_key(&pts);
    let mut output: Vec<u8> = Vec::new();
    verifier_key.
        commitment().serialize_compressed(& mut output).unwrap();

    output.into()
}


// "Static" ring context data
fn ring_context(ring_size:usize) -> RingContext {
    use bandersnatch::PcsParams;
    use std::{fs::File, io::Read};
    // let manifest_dir =
    //     std::env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR is not set");
    // println!("Hello from the Rust land!");
    // let filename = format!("{}/data/zcash-srs-2-11-uncompressed.bin", std::env::current_exe().unwrap().parent().unwrap().to_str().unwrap());
    //
    // let filename = "./data/zcash-srs-2-11-uncompressed.bin";
    // let mut file = File::open(filename).unwrap();
    // let mut buf = Vec::new();
    // file.read_to_end(&mut buf).unwrap();

    let pcs_params = PcsParams::deserialize_uncompressed_unchecked(&ar::ZCASHSRS211[..]).unwrap();
    // let pcs_params = PcsParams::deserialize_uncompressed_unchecked(&mut &buf[..]).unwrap();
    RingContext::from_srs(ring_size, pcs_params).unwrap()
}
