import {
  BandersnatchKey,
  BandersnatchPrivKey,
  BandersnatchRingRoot,
  BandersnatchSignature,
  OpaqueHash,
  RingVRFProof,
} from "@vekexasia/jam-types";
import { ringRoot } from "@vekexasia/jam-crypto-napi";
import { bigintToBytes, bytesToBigInt } from "@vekexasia/jam-codec";

export const Bandersnatch = {
  /**
   * `F_{pubkey}^{message}(context) `
   * @param bytes
   * @param pubkey
   * @param message
   * @param context
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
   * @param context
   * @param message
   * @param privkey
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
    return 1n as OpaqueHash; // TODO: implement
  },

  /**
   * `Y` function in the graypaper
   * (311)
   * @param ringRoot
   */
  vrfOutputRingProof(ringProof: RingVRFProof): OpaqueHash {
    return 1n as OpaqueHash; // TODO: implement
  },

  verifyVrfProof(
    proof: RingVRFProof,
    ringRoot: BandersnatchRingRoot,
    context: Uint8Array,
  ): boolean {
    return true; // TODO: implement
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
