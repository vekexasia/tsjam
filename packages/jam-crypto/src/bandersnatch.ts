import {
  BandersnatchKey,
  BandersnatchPrivKey,
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
} from "@tsjam/crypto-napi";
import { NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import { bigintToBytes, bytesToBigInt } from "@tsjam/utils";

export const Bandersnatch = {
  /**
   * `F_{pubkey}^{message}(context) `
   * $(0.5.0 - G.1)
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
    return ietfVrfVerify(
      bigintToBytes(pubkey, 32),
      context,
      message,
      bigintToBytes(signature, 96),
    );
  },

  /**
   * `F_{privkey}^{message}(context) `
   * $(0.5.0 - G.1)
   * @param context - the context of the signature
   * @param message - the message to sign
   * @param privkey - the private key to sign with
   */
  sign(
    privkey: BandersnatchPrivKey,
    message: Uint8Array,
    context: Uint8Array,
  ): BandersnatchSignature {
    return bytesToBigInt(
      ietfVrfSign(bigintToBytes(privkey, 64), context, message),
    );
  },

  /**
   * `Y` function in the graypaper
   * The alias/output/entropy function of a Bandersnatch vrf signature/proof. See section 3.8 and appendix
   * $(0.5.0 - G.2)
   */
  vrfOutputSignature(signature: BandersnatchSignature): OpaqueHash {
    return bytesToBigInt(
      ietfVrfOutputHash(
        bigintToBytes(signature, 96),
      ) as unknown as ByteArrayOfLength<32>,
    );
  },

  /** generate output from secret and context */
  vrfOutputSeed(seed: Uint8Array, context: Uint8Array): OpaqueHash {
    return bytesToBigInt(ietfVrfOutputHashFromSecret(seed, context));
  },

  /**
   * `Y` function in the graypaper
   * $(0.5.0 - G.5)
   */
  vrfOutputRingProof(ringProof: RingVRFProof): OpaqueHash {
    return bytesToBigInt(
      ringVrfOutputHash(ringProof) as unknown as ByteArrayOfLength<32>,
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
      Buffer.from(bigintToBytes(ringRoot, 144)),
      NUMBER_OF_VALIDATORS,
    );
  },

  /**
   * `O` function in the graypaper
   * $(0.5.0 - G.3)
   */
  ringRoot<T extends BandersnatchRingRoot>(input: BandersnatchKey[]): T {
    const inputBuf = Buffer.alloc(input.length * 32);
    input.forEach((key, idx) => {
      inputBuf.set(bigintToBytes(key, 32), idx * 32);
    });

    const root = Buffer.from(ringRoot(inputBuf));
    return bytesToBigInt(root as unknown as ByteArrayOfLength<144>) as T;
  },
};
