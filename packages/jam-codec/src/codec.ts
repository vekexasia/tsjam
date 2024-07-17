export interface JamCodec<T> {
  encode: (value: T, bytes: Uint8Array) => number;
  decode: (bytes: Uint8Array) => { value: T; readBytes: number };
  encodedSize: (value: T) => number;
}
