import {
  BandersnatchKey,
  BandersnatchRingRoot,
  BandersnatchSignature,
  ByteArrayOfLength,
  OpaqueHash,
  RingVRFProof,
} from "@tsjam/types";
import {
  ringRoot,
  ringVrfOutputHash,
  ietfVrfOutputHash,
  ietfVrfSign,
  ietfVrfVerify,
  ringVrfVerify,
  ietfVrfOutputHashFromSecret,
  publicKey,
} from "@tsjam/crypto-napi";
import { NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import { bytesToBigInt } from "@tsjam/utils";

export const Bandersnatch = {
  /**
   * `F_{pubkey}^{message}(context) `
   * $(0.6.4 - G.1)
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
    return ietfVrfVerify(pubkey, context, message, signature);
  },

  /**
   * `F_{privkey}^{message}(context) `
   * $(0.6.4 - G.1)
   * @param context - the context of the signature
   * @param message - the message to sign
   * @param privkey - the private key to sign with
   */
  sign(
    privkey: BandersnatchKey,
    message: Uint8Array,
    context: Uint8Array,
  ): BandersnatchSignature {
    return ietfVrfSign(
      privkey,
      context,
      message,
    ) as Uint8Array as BandersnatchSignature;
  },

  /**
   * `Y` function in the graypaper
   * The alias/output/entropy function of a Bandersnatch vrf signature/proof. See section 3.8 and appendix
   * $(0.6.4 - G.2)
   */
  vrfOutputSignature(signature: BandersnatchSignature): OpaqueHash {
    return bytesToBigInt(
      ietfVrfOutputHash(signature) as Uint8Array as ByteArrayOfLength<32>,
    );
  },

  /** generate output from secret and context */
  vrfOutputSeed(privKey: BandersnatchKey, context: Uint8Array): OpaqueHash {
    return bytesToBigInt(ietfVrfOutputHashFromSecret(privKey, context));
  },

  /**
   * `Y` function in the graypaper
   * $(0.6.4 - G.5)
   */
  vrfOutputRingProof(ringProof: RingVRFProof): OpaqueHash {
    return bytesToBigInt(
      ringVrfOutputHash(ringProof) as Uint8Array as ByteArrayOfLength<32>,
    );
  },

  verifyVrfProof(
    proof: RingVRFProof,
    ringRoot: BandersnatchRingRoot,
    context: Uint8Array,
  ): boolean {
    return ringVrfVerify(
      proof,
      context,
      new Uint8Array(0),
      Buffer.from(ringRoot),
      NUMBER_OF_VALIDATORS,
    );
  },

  /**
   * `O` function in the graypaper
   * $(0.6.4 - G.3)
   */
  ringRoot<T extends BandersnatchRingRoot>(input: BandersnatchKey[]): T {
    const inputBuf = Buffer.alloc(input.length * 32);
    input.forEach((key, idx) => {
      inputBuf.set(key, idx * 32);
    });

    return ringRoot(inputBuf) as Uint8Array as T;
  },

  publicFromSeed(seed: Uint8Array): BandersnatchKey {
    return new Uint8Array(publicKey(seed)) as BandersnatchKey;
  },
};
