export interface JamCodec<T> {
  /**
   * Encode value into byte array
   * @returns number of written bytes
   */
  encode: (value: T, bytes: Uint8Array) => number;
  decode: (bytes: Uint8Array) => { value: T; readBytes: number };
  encodedSize: (value: T) => number;
}
