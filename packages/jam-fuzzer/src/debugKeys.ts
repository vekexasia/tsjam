import { encodeWithCodec, E_sub_int } from "@tsjam/codec";
import { Hashing, Bandersnatch, Ed25519 } from "@tsjam/crypto";

export const generateDebugKeys = (index: number) => {
  const a = encodeWithCodec(E_sub_int(4), index);
  const trivialSeed = new Uint8Array([
    ...a,
    ...a,
    ...a,
    ...a,
    ...a,
    ...a,
    ...a,
    ...a,
  ]);

  const bandersnatch_secret_seed = Hashing.blake2b(
    new Uint8Array([
      ...new TextEncoder().encode("jam_val_key_bandersnatch"),
      ...trivialSeed,
    ]),
  );

  const ed25519_secret_seed = Hashing.blake2b(
    new Uint8Array([
      ...new TextEncoder().encode("jam_val_key_ed25519"),
      ...trivialSeed,
    ]),
  );

  const bandersnatch_public = Bandersnatch.publicKey(bandersnatch_secret_seed);
  console.log(bandersnatch_public);
  return {
    ed25519: {
      ...Ed25519.keypair(ed25519_secret_seed),
      secret_seed: ed25519_secret_seed,
    },
    bandersnatch: {
      public: bandersnatch_public,
      secret_seed: bandersnatch_secret_seed,
      private: Bandersnatch.privKey(bandersnatch_secret_seed),
    },
  };
};

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;
  const { xBytesCodec } = await import("@tsjam/codec");
  describe("Genesis", () => {
    it("should generate proper bander debug keys", () => {
      const { bandersnatch } = generateDebugKeys(1);
      expect(xBytesCodec(32).toJSON(bandersnatch.public)).deep.eq(
        "0xdee6d555b82024f1ccf8a1e37e60fa60fd40b1958c4bb3006af78647950e1b91",
      );
      expect(xBytesCodec(32).toJSON(bandersnatch.secret_seed)).deep.eq(
        "0x12ca375c9242101c99ad5fafe8997411f112ae10e0e5b7c4589e107c433700ac",
      );

      const signature = Bandersnatch.sign(
        bandersnatch.private,
        new TextEncoder().encode("message"),
        new TextEncoder().encode("context"),
      );

      expect(
        Bandersnatch.verifySignature(
          signature,
          bandersnatch.public,
          new TextEncoder().encode("message"),
          new TextEncoder().encode("context"),
        ),
      ).toBe(true);
    });

    it("should generate proper ed25519 debug keys", () => {
      const { ed25519 } = generateDebugKeys(1);
      expect(xBytesCodec(32).toJSON(ed25519.secret_seed)).deep.eq(
        "0xb81e308145d97464d2bc92d35d227a9e62241a16451af6da5053e309be4f91d7",
      );
      expect(xBytesCodec(32).toJSON(ed25519.public)).deep.eq(
        "0xad93247bd01307550ec7acd757ce6fb805fcf73db364063265b30a949e90d933",
      );

      const signature = Ed25519.sign(
        new TextEncoder().encode("message"),
        ed25519.privateKey,
      );

      expect(
        Ed25519.verifySignature(
          signature,
          ed25519.public,
          new TextEncoder().encode("message"),
        ),
      ).toBe(true);
    });
  });
}
