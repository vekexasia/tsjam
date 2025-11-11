import { ed25519Keypair, ed25519Sign, ed25519Verify } from "@tsjam/crypto-napi";
import {
  ByteArrayOfLength,
  ED25519PrivateKey,
  ED25519PublicKey,
  ED25519Signature,
} from "@tsjam/types";

export const Ed25519 = {
  /**
   * `E_{pubkey}(message) `
   */
  verifySignature(
    signature: ED25519Signature,
    pubkey: ED25519PublicKey,
    message: Uint8Array,
  ): boolean {
    try {
      return ed25519Verify(message, pubkey, signature);
    } catch (e) {
      console.error(e);
      return false;
    }
  },

  /**
   * `E_{privkey}(message) `
   */
  sign(message: Uint8Array, privkey: ED25519PrivateKey): ED25519Signature {
    return ed25519Sign(message, privkey.subarray(0, 32)) as ED25519Signature;
  },

  keypair(seed: ByteArrayOfLength<32>) {
    const x = ed25519Keypair(seed);
    return {
      public: <ED25519PublicKey>(<Uint8Array>x.subarray(32)),
      privateKey: <ED25519PrivateKey>(<Uint8Array>x.subarray(0, 64)),
    };
  },
};
