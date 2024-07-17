import { JamCodec } from "@/codec.js";
import { E } from "@/ints/e.js";

/**
 * Length discriminator provides a way to encode variable length stuff
 * by prepending the length
 */
export class LengthDiscriminator<T> implements JamCodec<T> {
  constructor(private subCodec: JamCodec<T>) {}

  encode(value: T, bytes: Uint8Array): number {
    const size = this.subCodec.encodedSize(value);
    const sizeBN = BigInt(size);
    const lengthSize = E.encodedSize(sizeBN);
    E.encode(sizeBN, bytes.subarray(0, lengthSize));
    this.subCodec.encode(value, bytes.subarray(lengthSize));
    return lengthSize + size;
  }

  decode(bytes: Uint8Array): { value: T; readBytes: number } {
    const encodedLength = E.decode(bytes);

    const encodedValue = this.subCodec.decode(
      bytes.subarray(
        encodedLength.readBytes,
        encodedLength.readBytes + Number(encodedLength.value),
      ),
    );
    return {
      value: encodedValue.value,
      readBytes: encodedLength.readBytes + encodedValue.readBytes,
    };
  }

  encodedSize(value: T): number {
    const x = this.subCodec.encodedSize(value);
    return x + E.encodedSize(BigInt(x));
  }
}

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
