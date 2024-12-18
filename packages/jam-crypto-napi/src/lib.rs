#![deny(clippy::all)]

mod ar;
use ark_ec_vrfs::suites::bandersnatch::edwards as bandersnatch;
use ark_ec_vrfs::{prelude::ark_serialize, suites::bandersnatch::edwards::RingContext};
use ark_serialize::{CanonicalDeserialize, CanonicalSerialize};
use bandersnatch::{IetfProof, Input, Output, Public, RingProof, Secret};
use napi::bindgen_prelude::Buffer;
use std::convert::TryInto;

#[macro_use]
extern crate napi_derive;

type RingCommitment = ark_ec_vrfs::ring::RingCommitment<bandersnatch::BandersnatchSha512Ell2>;
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
  let secret = Secret:: from_seed(seed);
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

#[napi]
pub fn ring_vrf_verify(
  signature: &[u8],
  vrf_input_data: &[u8],
  aux_data: &[u8],
  commitment: Buffer,
  ring_size: u32,
) -> bool {
  use ark_ec_vrfs::ring::Verifier as _;

  let signature = RingVrfSignature::deserialize_compressed(signature).unwrap();
  let input = vrf_input_point(vrf_input_data);
  let output = signature.output;
  let ring_ctx = ring_context(ring_size.try_into().unwrap());
  let commitment = RingCommitment::deserialize_compressed(commitment.as_ref()).unwrap();

  let verifierKey = ring_ctx.verifier_key_from_commitment(commitment);
  let verifier = ring_ctx.verifier(verifierKey);

  !Public::verify(input, output, aux_data, &signature.proof, &verifier).is_err()
}

#[napi]
pub fn ring_root(input: &[u8]) -> Buffer {
  let mut ring: Vec<Public> = Vec::new();
  let ring_ctx = ring_context(input.len() / 32);
  let padding_point = ring_ctx.padding_point();
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

fn ring_context(ring_size: usize) -> RingContext {
  use bandersnatch::PcsParams;
  let pcs_params = PcsParams::deserialize_uncompressed_unchecked(&ar::ZCASHSRS211[..]).unwrap();
  // let pcs_params = PcsParams::deserialize_uncompressed_unchecked(&mut &buf[..]).unwrap();
  RingContext::from_srs(ring_size, pcs_params).unwrap()
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
    let secret = Secret::from_seed(seed);
    let input = vrf_input_point(vrf_input_data);
    let output = secret.output(input);

    output.hash()[..32].try_into().unwrap()
}

/**
 * G.1
 * sign 
 */
#[napi]
pub fn ietf_vrf_sign(secret: &[u8], vrf_input_data: &[u8], aux_data: &[u8] ) -> Buffer {
    use ark_ec_vrfs::ietf::Prover as _;

    let secret = if let Ok(s) = Secret::deserialize_compressed(secret) {
      s
    } else {
      return Vec::new().into();
    };

    let input = vrf_input_point(vrf_input_data);
    let output = secret.output(input);

    let proof = secret.prove(input, output, aux_data);

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
pub fn ietf_vrf_verify(public_key: &[u8], vrf_input_data: &[u8], aux_data: &[u8],signature: &[u8]) -> bool {
    use ark_ec_vrfs::ietf::Verifier as _;
    if signature.len() != 96  || public_key.len() != 32 {
        return false;
    }

    let input = vrf_input_point(vrf_input_data);
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

    return !public_key.verify(input, signature.output, aux_data, &signature.proof).is_err()
}

#[napi]
pub fn ietf_vrf_output_hash(signature: &[u8]) -> Buffer {
  let signature = IetfVrfSignature::deserialize_compressed(signature).unwrap();
  let output = signature.output;
  output.hash()[..32].try_into().unwrap()
}
