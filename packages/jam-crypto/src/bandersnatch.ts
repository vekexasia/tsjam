import {
  BandersnatchKey,
  BandersnatchPrivKey,
  BandersnatchSignature,
  OpaqueHash,
} from "@vekexasia/jam-types";

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

  vrfOutput(signature: BandersnatchSignature): OpaqueHash {
    return 1n as OpaqueHash; // TODO: implement
  },
};
