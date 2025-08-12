import {
  BufferJSONCodec,
  fixedSizeIdentityCodec,
  JamCodec,
  JSONCodec,
} from "@tsjam/codec";
import { ByteArrayOfLength, Hash } from "@tsjam/types";
export const xBytesCodec = <T extends ByteArrayOfLength<K>, K extends number>(
  k: K,
) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <JamCodec<T> & JSONCodec<T>>(<any>{
    ...fixedSizeIdentityCodec(k),
    ...BufferJSONCodec(),
  });
};

export const HashCodec = xBytesCodec<Hash, 32>(32);
