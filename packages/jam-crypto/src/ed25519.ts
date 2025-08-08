import {
  ED25519PrivateKey,
  ED25519PublicKey,
  ED25519Signature,
} from "@tsjam/types";
import sodium from "sodium-native";

export const Ed25519 = {
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
      Buffer.from(pubkey),
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
