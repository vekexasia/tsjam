import { JamCodec } from "@/codec.js";
import { binaryCodec, jsonCodec, SINGLE_ELEMENT_CLASS } from "@/decorators";
import { NULLORCodec } from "./json/codecs";
import { JSONCodec } from "./json/json-codec";

/**
 * OptCodec is a codec that allows for optional values
 * it is defined in 277 in graypaper and identified with ¿x
 * $(0.6.4 - C.9)
 */
export class Optional<T> implements JamCodec<T | undefined | null> {
  constructor(private codec: JamCodec<T>) {}

  encode(value: T | undefined | null, bytes: Uint8Array): number {
    if (typeof value === "undefined" || value === null) {
      bytes[0] = 0;
    } else {
      bytes[0] = 1;
      this.codec.encode(value, bytes.subarray(1));
    }
    return this.encodedSize(value);
  }

  decode(bytes: Uint8Array): { value: T | undefined; readBytes: number } {
    if (bytes[0] === 0) {
      return { value: undefined, readBytes: 1 };
    } else {
      const decoded = this.codec.decode(bytes.subarray(1));
      return { value: decoded.value, readBytes: decoded.readBytes + 1 };
    }
  }

  encodedSize(value: T | undefined | null): number {
    if (typeof value === "undefined" || value === null) {
      return 1;
    }
    return this.codec.encodedSize(value) + 1;
  }
}

/**
 * class property decorator
 */
export const optionalCodec = <T>(
  codec: JamCodec<T> & JSONCodec<T>,
  jsonKey?: string | typeof SINGLE_ELEMENT_CLASS,
) => {
  return function (target: unknown, propertyKey: string) {
    binaryCodec(new Optional(codec))(target, propertyKey);
    jsonCodec(NULLORCodec(codec), jsonKey)(target, propertyKey);
  };
};

if (import.meta.vitest) {
  const { E } = await import("@/ints/e.js");
  const { describe, expect, it } = import.meta.vitest;
  describe("Optional", () => {
    it("should encode and decode a value", () => {
      const bytes = new Uint8Array(10);
      const a = new Optional(E);
      const encodedLength = a.encode(2n, bytes);
      expect(a.decode(bytes.subarray(0, encodedLength)).value).toBe(2n);
    });
    it("should add one byte to encoded value", () => {
      const a = new Optional(E);
      expect(a.encodedSize(2n)).toBe(E.encodedSize(2n) + 1);
      expect(a.encodedSize(undefined)).toBe(1);
    });
    it("should encode/decode nil value", () => {
      const bytes = new Uint8Array(1);
      bytes[0] = 255; // force set byte to check if it's reset
      const a = new Optional(E);
      const encodedLength = a.encode(undefined, bytes);
      expect(bytes[0]).toBe(0);
      expect(a.decode(bytes.subarray(0, encodedLength)).value).toBe(undefined);
    });
  });
}
