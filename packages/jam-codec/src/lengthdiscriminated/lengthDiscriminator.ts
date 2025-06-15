import { JamCodec } from "@/codec.js";
import { E } from "@/ints/e.js";
import { IdentityCodec } from "@/identity.js";
import { createSetCodec } from "@/set";
export type LengthDiscSubCodec<T> = Omit<JamCodec<T>, "decode"> & {
  /**
   * Returns the length to store in the length discriminator
   * if not present then @see encodedSize is used
   * @param value - the value to encode
   * @see encodedSize
   */
  length?(value: T): number;
  decode(bytes: Uint8Array, length: number): { value: T; readBytes: number };
};

/**
 * Length discriminator provides a way to encode variable length stuff
 * by prepending the length
 */
export class LengthDiscriminator<T> implements JamCodec<T> {
  constructor(private subCodec: LengthDiscSubCodec<T>) {}

  encode(value: T, bytes: Uint8Array): number {
    const length = (this.subCodec.length ?? this.subCodec.encodedSize).call(
      this.subCodec,
      value,
    );
    const sizeBN = BigInt(length);
    const lengthSize = E.encodedSize(sizeBN);
    E.encode(sizeBN, bytes.subarray(0, lengthSize));

    const encodedSize = this.subCodec.encode(value, bytes.subarray(lengthSize));
    return lengthSize + encodedSize;
  }

  decode(bytes: Uint8Array): { value: T; readBytes: number } {
    const encodedLength = E.decode(bytes);

    const encodedValue = this.subCodec.decode(
      bytes.subarray(encodedLength.readBytes),
      Number(encodedLength.value),
    );
    return {
      value: encodedValue.value,
      readBytes: encodedLength.readBytes + encodedValue.readBytes,
    };
  }

  encodedSize(value: T): number {
    const x = this.subCodec.encodedSize(value);
    return (
      x +
      E.encodedSize(
        BigInt(
          (this.subCodec.length ?? this.subCodec.encodedSize).call(
            this.subCodec,
            value,
          ),
        ),
      )
    );
  }
}

export const createLengthDiscriminatedIdentity = <
  T extends Uint8Array,
>(): JamCodec<T> => {
  return new LengthDiscriminator({
    ...IdentityCodec,
    decode(bytes: Uint8Array, length: number) {
      return IdentityCodec.decode(bytes.subarray(0, length)) as {
        value: T;
        readBytes: number;
      };
    },
  });
};

export const createLengthDiscrimantedSetCodec = <X>(
  itemCodec: JamCodec<X>,
  sorter: (a: X, b: X) => number,
): JamCodec<Set<X>> => {
  const setCodec = createSetCodec(itemCodec, sorter);

  return new LengthDiscriminator<Set<X>>({
    ...setCodec,
    decode(bytes, length) {
      let offset = 0;
      const value = new Set<X>();
      for (let i = 0; i < length; i++) {
        const decoded = itemCodec.decode(bytes.subarray(offset));
        value.add(decoded.value);
        offset += decoded.readBytes;
      }
      return {
        value,
        readBytes: offset,
      };
    },
    length(value) {
      return value.size;
    },
  });
};
/**
 * Utility to encode/decode a byteArray with a length discriminator
 * TODO: rename to ....Codec
 */
export const LengthDiscrimantedIdentity =
  createLengthDiscriminatedIdentity<Uint8Array>();

if (import.meta.vitest) {
  const { E } = await import("@/ints/e.js");
  const { describe, expect, it } = import.meta.vitest;
  describe("LengthDiscriminator", () => {
    it("should encode and decode a value", () => {
      const bytes = new Uint8Array(10);
      const a = new LengthDiscriminator(E);
      const encodedLength = a.encode(2n, bytes);
      expect(a.decode(bytes.subarray(0, encodedLength)).value).toBe(2n);
    });
    it("should encode the length of the encoded value", () => {
      const bytes = new Uint8Array(12);
      const a = new LengthDiscriminator(E);
      const value = 2n ** (7n * 8n);
      const encodedLength = a.encode(value, bytes);
      const encodedEL = E.encodedSize(BigInt(encodedLength));
      expect(encodedLength).toBe(E.encodedSize(value) + encodedEL);
      E.decode(bytes.subarray(0, encodedEL));
    });
  });
}
