#![deny(clippy::all)]

mod ar;
use ark_vrf::reexports::{
  ark_ec::AffineRepr,
  ark_serialize::{self, CanonicalDeserialize, CanonicalSerialize},
};
use ark_vrf::{pedersen::PedersenSuite, ring::RingSuite, suites::bandersnatch};
use bandersnatch::{
  AffinePoint, BandersnatchSha512Ell2, IetfProof, Input, Output, Public, RingProof,
  RingProofParams, Secret,
};
use napi::bindgen_prelude::Buffer;
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

/**
 * input point from data
 */
fn vrf_input_point(vrf_input_data: &[u8]) -> Input {
  // ignore rust `Option`
  Input::new(vrf_input_data).unwrap()
}

#[napi]
pub fn public_key(seed: &[u8]) -> Buffer {
  let secret = Secret::from_seed(seed);
  let public = secret.public();
  let mut buf = Vec::new();
  public.serialize_compressed(&mut buf).unwrap();
  buf.into()
}

#[napi]
pub fn secret_key(seed: &[u8]) -> Buffer {
  let secret = Secret::from_seed(seed);
  let mut buf = Vec::new();
  secret.serialize_compressed(&mut buf).unwrap();
  buf.into()
}

#[napi]
pub fn ring_vrf_output_hash(signature: &[u8]) -> Buffer {
  let signature = RingVrfSignature::deserialize_compressed(signature).unwrap();
  let output = signature.output;
  //
  output.hash()[..32].try_into().unwrap()
}

type RingCommitment = ark_vrf::ring::RingCommitment<BandersnatchSha512Ell2>;

#[napi]
pub fn ring_vrf_verify(
  signature: &[u8],
  vrf_input_data: &[u8],
  aux_data: &[u8],
  commitment: Buffer,
  ring_size: u32,
) -> bool {
  use ark_vrf::ring::Verifier as _;
  let signature = RingVrfSignature::deserialize_compressed(signature).unwrap();
  let input = vrf_input_point(vrf_input_data);
  let output = signature.output;
  let params = ring_proof_params(ring_size.try_into().unwrap());
  let commitment = RingCommitment::deserialize_compressed(commitment.as_ref()).unwrap();

  let verifier_key = params.verifier_key_from_commitment(commitment);
  let verifier = params.verifier(verifier_key);

  !Public::verify(input, output, aux_data, &signature.proof, &verifier).is_err()
}

// TODO:
#[napi]
pub fn ring_root(input: &[u8]) -> Buffer {
  let mut ring: Vec<Public> = Vec::new();
  let ring_ctx = ring_proof_params(input.len() / 32);
  let padding_point = RingProofParams::padding_point();
  // have u8 checked to be 32 in length and have each chunk inserted into the ring
  input
    .chunks_exact(32)
    .try_for_each(|c| {
      let pk = Public::deserialize_compressed(c).unwrap_or(Public::from(padding_point));
      ring.push(pk);
      Ok::<(), ()>(())
    })
    .unwrap();

  let pts: Vec<_> = ring.iter().map(|pk| pk.0).collect();
  let verifier_key = ring_ctx.verifier_key(&pts);
  let mut output: Vec<u8> = Vec::new();
  let commitment = verifier_key.commitment();
  commitment.serialize_compressed(&mut output).unwrap();

  output.into()
}

fn ring_proof_params(ring_size: usize) -> RingProofParams {
  use bandersnatch::PcsParams;
  let pcs_params = PcsParams::deserialize_uncompressed_unchecked(&ar::ZCASHSRS211[..]).unwrap();

  RingProofParams::from_pcs_params(ring_size, pcs_params).unwrap()
}

/**
 * Generates `Y` without signatur
 */
#[napi]
pub fn ietf_vrf_output_hash_from_secret(secret: &[u8], vrf_input_data: &[u8]) -> Buffer {
  let secret = if let Ok(s) = Secret::deserialize_compressed(secret) {
    s
  } else {
    return Vec::new().into();
  };
  //    let secret = Secret::from_seed(seed);
  let input = vrf_input_point(vrf_input_data);
  let output = secret.output(input);

  output.hash()[..32].try_into().unwrap()
}

/**
 * G.1
 * sign
 */
#[napi]
pub fn ietf_vrf_sign(secret: &[u8], vrf_input_data: &[u8], aux_data: &[u8]) -> Buffer {
  use ark_vrf::ietf::Prover as _;
  let secret = if let Ok(s) = Secret::deserialize_compressed(secret) {
    s
  } else {
    return Vec::new().into();
  };

  let input = vrf_input_point(vrf_input_data);
  let output = secret.output(input);

  let proof = secret.prove(input, output, aux_data);

  // Output and IETF Proof bundled together (as per section 2.2)
  let signature = IetfVrfSignature { output, proof };
  let mut buf = Vec::new();
  signature.serialize_compressed(&mut buf).unwrap();
  buf.into()
}

/**
 * G.1
 * verify signature with given pubkey
 */
#[napi]
pub fn ietf_vrf_verify(
  public_key: &[u8],
  vrf_input_data: &[u8],
  aux_data: &[u8],
  signature: &[u8],
) -> bool {
  use ark_vrf::ietf::Verifier as _;

  if signature.len() != 96 || public_key.len() != 32 {
    return false;
  }

  let signature = if let Ok(s) = IetfVrfSignature::deserialize_compressed(signature) {
    s
  } else {
    return false;
  };

  let public_key = if let Ok(p) = Public::deserialize_compressed(public_key) {
    p
  } else {
    return false;
  };

  let input = vrf_input_point(vrf_input_data);
  let output = signature.output;

  // let public = &self.ring[signer_key_index];
  if public_key
    .verify(input, output, aux_data, &signature.proof)
    .is_err()
  {
    println!("Ring signature verification failure");
    return false;
  }
  return true;
}

#[napi]
pub fn ietf_vrf_output_hash(signature: &[u8]) -> Buffer {
  let signature = IetfVrfSignature::deserialize_compressed(signature).unwrap();
  let output = signature.output;
  output.hash()[..32].try_into().unwrap()
}
