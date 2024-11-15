/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  BandersnatchKey,
  BandersnatchPrivKey,
  BandersnatchRingRoot,
  BandersnatchSignature,
  OpaqueHash,
  RingVRFProof,
} from "@tsjam/types";
import { ringRoot, vrfOutputHash, vrfVerify } from "@tsjam/crypto-napi";
import { NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import { bigintToBytes, bytesToBigInt } from "@tsjam/utils";

export const Bandersnatch = {
  /**
   * `F_{pubkey}^{message}(context) `
   * @param signature - the signature to verify
   * @param pubkey - the public key to verify the signature with
   * @param message - the message that was signed
   * @param context - the context of the signature
   */
  verifySignature(
    signature: BandersnatchSignature,
    pubkey: BandersnatchKey,
    message: Uint8Array,
    context: Uint8Array,
  ): boolean {
    return true; // TODO: implement
  },

  /**
   * `F_{privkey}^{message}(context) `
   * @param context - the context of the signature
   * @param message - the message to sign
   * @param privkey - the private key to sign with
   */
  sign(
    context: Uint8Array,
    message: Uint8Array,
    privkey: BandersnatchPrivKey,
  ): BandersnatchSignature {
    return 0n as BandersnatchSignature;
  },

  /**
   * `Y` function in the graypaper
   * The alias/output/entropy function of a Bandersnatch vrf signature/proof. See section 3.8 and appendix
   * (312)
   */
  vrfOutputSignature(signature: BandersnatchSignature): OpaqueHash {
    return bytesToBigInt(vrfOutputHash(bigintToBytes(signature, 96)));
  },

  /**
   * `Y` function in the graypaper
   * (311)
   */
  vrfOutputRingProof(ringProof: RingVRFProof): OpaqueHash {
    return bytesToBigInt(vrfOutputHash(ringProof));
  },

  verifyVrfProof(
    proof: RingVRFProof,
    ringRoot: BandersnatchRingRoot,
    context: Uint8Array,
  ): boolean {
    return vrfVerify(
      proof,
      context,
      new Uint8Array(0),
      Buffer.from(bigintToBytes(ringRoot, 144)),
      NUMBER_OF_VALIDATORS,
    );
  },

  /**
   * `O` function in the graypaper
   * @see (310) in the graypaper
   */
  ringRoot<T extends BandersnatchRingRoot>(input: BandersnatchKey[]): T {
    const inputBuf = Buffer.alloc(input.length * 32);
    input.forEach((key, idx) => {
      inputBuf.set(bigintToBytes(key, 32), idx * 32);
    });

    const root = Buffer.from(ringRoot(inputBuf));
    return bytesToBigInt(root) as T;
  },
};
