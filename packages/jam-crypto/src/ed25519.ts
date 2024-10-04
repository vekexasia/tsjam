import {
  ED25519PrivateKey,
  ED25519PublicKey,
  ED25519Signature,
} from "@vekexasia/jam-types";
import sodium from "sodium-native";
import { bigintToBytes, bytesToBigInt } from "@vekexasia/jam-utils";

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
      Buffer.from(bigintToBytes(signature, 64)),
      Buffer.from(message),
      Buffer.from(bigintToBytes(pubkey, 32)),
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
      Buffer.from(bigintToBytes(privkey, 64)),
    );
    return bytesToBigInt(signatureBuf);
  },
};
