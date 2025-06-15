import {
  ED25519PrivateKey,
  ED25519PublicKey,
  ED25519Signature,
} from "@tsjam/types";
import sodium from "sodium-native";

export const Ed25519 = {
  privKeyFromSeed(seed: Uint8Array): {
    private: ED25519PrivateKey;
    public: ED25519PublicKey["buf"];
  } {
    const publicKeyBuf = Buffer.alloc(32);
    const privateKeyBuf = Buffer.alloc(64);
    sodium.crypto_sign_seed_keypair(
      publicKeyBuf,
      privateKeyBuf,
      Buffer.from(seed),
    );
    return {
      private: new Uint8Array([...privateKeyBuf]) as ED25519PrivateKey,
      public: new Uint8Array([...publicKeyBuf]) as ED25519PublicKey["buf"],
    };
  },

  /**
   * `E_{pubkey}(message) `
   */
  verifySignature(
    signature: ED25519Signature,
    pubkey: ED25519PublicKey,
    message: Uint8Array,
  ): boolean {
    return sodium.crypto_sign_verify_detached(
      Buffer.from(signature),
      Buffer.from(message),
      Buffer.from(pubkey.buf),
    );
  },

  /**
   * `E_{privkey}(message) `
   */
  sign(message: Uint8Array, privkey: ED25519PrivateKey): ED25519Signature {
    const signatureBuf = Buffer.alloc(64);
    sodium.crypto_sign_detached(
      signatureBuf,
      Buffer.from(message),
      Buffer.from(privkey),
    );
    return signatureBuf as Uint8Array as ED25519Signature;
  },
};
