import { JamCodec } from "@/codec.js";

/**
 * OptCodec is a codec that allows for optional values
 * it is defined in 277 in graypaper and identified with ¿x
 */
export class OptCodec<T> implements JamCodec<T | undefined> {
  constructor(private codec: JamCodec<T>) {}

  encode(value: T | undefined, bytes: Uint8Array): number {
    if (value === undefined) {
      return 0;
    }
    return this.codec.encode(value, bytes);
  }

  decode(bytes: Uint8Array): { value: T | undefined; readBytes: number } {
    if (bytes.length === 0) {
      return { value: undefined, readBytes: 0 };
    }
    return this.codec.decode(bytes);
  }

  encodedSize(value: T | undefined): number {
    if (value === undefined) {
      return 0;
    }
    return this.codec.encodedSize(value);
  }
}
