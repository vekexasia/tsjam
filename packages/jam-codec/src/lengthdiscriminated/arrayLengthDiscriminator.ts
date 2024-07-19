import { JamCodec } from "@/codec.js";
import { E } from "@/ints/e.js";
import assert from "node:assert";

/**
 * ArrayLengthDiscriminator provides a way to encode variable length array of single encodable elements
 */
export class ArrayLengthDiscriminator<T> implements JamCodec<T[]> {
  constructor(private subCodec: JamCodec<T>) {}
  encode(value: T[], bytes: Uint8Array): number {
    const length = value.length;
    const lengthSize = E.encodedSize(BigInt(length));
    E.encode(BigInt(length), bytes.subarray(0, lengthSize));
    assert.ok(length === value.length);
    let offset = lengthSize;
    for (const item of value) {
      offset += this.subCodec.encode(item, bytes.subarray(offset));
    }
    return offset;
  }
  decode(bytes: Uint8Array) {
    const decodedLength = E.decode(bytes);
    const length = Number(decodedLength.value);
    const values: T[] = [];
    let offset = decodedLength.readBytes;
    for (let i = 0; i < length; i++) {
      const decoded = this.subCodec.decode(bytes.subarray(offset));
      values.push(decoded.value);
      offset += decoded.readBytes;
    }
    return {
      value: values,
      readBytes: offset,
    };
  }
  encodedSize(value: T[]) {
    return (
      E.encodedSize(BigInt(value.length)) +
      value.reduce((acc, item) => acc + this.subCodec.encodedSize(item), 0)
    );
  }
}
