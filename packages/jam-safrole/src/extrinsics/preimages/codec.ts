import {
  E,
  IdentityCodec,
  JamCodec,
  LengthDiscriminator,
  createArrayLengthDiscriminator,
} from "@vekexasia/jam-codec";
import { EP_Tuple, ServiceIndex } from "@vekexasia/jam-types";

const preimageCodec = new LengthDiscriminator(IdentityCodec);
/**
 * Codec for a single item in the extrinsic payload
 */
const singleItemCodec: JamCodec<EP_Tuple> = {
  encode(value: EP_Tuple, bytes: Uint8Array): number {
    let offset = E.encode(BigInt(value.serviceIndex), bytes);
    offset += preimageCodec.encode(value.preimage, bytes.subarray(offset));
    return offset;
  },
  decode(bytes: Uint8Array): { value: EP_Tuple; readBytes: number } {
    const decodedServiceIndex = E.decode(bytes);
    const decodedPreimage = preimageCodec.decode(
      bytes.subarray(decodedServiceIndex.readBytes),
    );
    return {
      value: {
        serviceIndex: Number(decodedServiceIndex.value) as ServiceIndex,
        preimage: decodedPreimage.value,
      },
      readBytes: decodedServiceIndex.readBytes + decodedPreimage.readBytes,
    };
  },
  encodedSize(value: EP_Tuple): number {
    return (
      E.encodedSize(BigInt(value.serviceIndex)) +
      preimageCodec.encodedSize(value.preimage)
    );
  },
};

/**
 * Codec for the extrinsic payload
 */
export const codec_Ep = createArrayLengthDiscriminator(singleItemCodec);
// TODO: Add tests
