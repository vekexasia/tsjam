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
