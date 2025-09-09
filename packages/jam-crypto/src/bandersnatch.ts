import { NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import {
  ietfVrfOutputHash,
  ietfVrfOutputHashFromSecret,
  ietfVrfSign,
  ietfVrfVerify,
  publicKey,
  ringRoot,
  ringVrfOutputHash,
  ringVrfVerify,
  secretKey,
} from "@tsjam/crypto-napi";
import {
  BandersnatchKey,
  BandersnatchRingRoot,
  BandersnatchSignature,
  ByteArrayOfLength,
  OpaqueHash,
  RingVRFProof,
} from "@tsjam/types";

export const Bandersnatch = {
  /**
   * `F_{pubkey}^{message}(context) `
   * $(0.7.1 - G.1)
   * @param signature - the signature to verify
   * @param pubkey - the public key to verify the signature with
   * @param message - the message that was signed
   * @param context - the context of the signature
   */
  verifySignature(
    signature: BandersnatchSignature,
    pubkey: BandersnatchKey,
    message: Buffer,
    context: Buffer,
  ): boolean {
    return ietfVrfVerify(pubkey, context, message, signature);
  },

  /**
   * `F_{privkey}^{message}(context) `
   * $(0.7.1 - G.1)
   * @param context - the context of the signature
   * @param message - the message to sign
   * @param privkey - the private key to sign with
   */
  sign(
    privkey: BandersnatchKey,
    message: Buffer,
    context: Buffer,
  ): BandersnatchSignature {
    return ietfVrfSign(privkey, context, message) as BandersnatchSignature;
  },

  /**
   * `Y` function in the graypaper
   * The alias/output/entropy function of a Bandersnatch vrf signature/proof. See section 3.8 and appendix
   * $(0.7.1 - G.2)
   */
  vrfOutputSignature(signature: BandersnatchSignature): OpaqueHash {
    return ietfVrfOutputHash(signature) as ByteArrayOfLength<32> as OpaqueHash;
  },

  /** generate output from secret and context */
  vrfOutputSeed(privKey: BandersnatchKey, context: Buffer): OpaqueHash {
    return ietfVrfOutputHashFromSecret(
      privKey,
      context,
    ) as ByteArrayOfLength<32> as OpaqueHash;
  },

  /**
   * `Y` function in the graypaper
   * $(0.7.1 - G.5)
   */
  vrfOutputRingProof(ringProof: RingVRFProof): OpaqueHash {
    return ringVrfOutputHash(ringProof) as ByteArrayOfLength<32> as OpaqueHash;
  },

  verifyVrfProof(
    proof: RingVRFProof,
    ringRoot: BandersnatchRingRoot,
    context: Buffer,
  ): boolean {
    return ringVrfVerify(
      proof,
      context,
      Buffer.alloc(0),
      ringRoot,
      NUMBER_OF_VALIDATORS,
    );
  },

  /**
   * `O` function in the graypaper
   * $(0.7.1 - G.3)
   */
  ringRoot<T extends BandersnatchRingRoot>(input: BandersnatchKey[]): T {
    const inputBuf = Buffer.alloc(input.length * 32);
    input.forEach((key, idx) => {
      key.copy(inputBuf, idx * 32);
    });

    return ringRoot(inputBuf) as Uint8Array as T;
  },

  publicKey(secretSeed: ByteArrayOfLength<32>): BandersnatchKey {
    return publicKey(secretSeed) as BandersnatchKey;
  },

  privKey(seed: ByteArrayOfLength<32>): BandersnatchKey {
    return secretKey(seed) as BandersnatchKey;
  },
};
