import {
  BufferJSONCodec,
  fixedSizeIdentityCodec,
  JamCodec,
  JSONCodec,
} from "@tsjam/codec";
import { ByteArrayOfLength, ED25519PublicKey, Hash } from "@tsjam/types";
export const xBytesCodec = <T extends ByteArrayOfLength<K>, K extends number>(
  k: K,
) => {
  return <JamCodec<T> & JSONCodec<T>>(<any>{
    ...fixedSizeIdentityCodec(k),
    ...BufferJSONCodec(),
  });
};

export const HashCodec = xBytesCodec<Hash, 32>(32);
export const ED25519PublicKeyCodec = xBytesCodec<ED25519PublicKey, 32>(32);
