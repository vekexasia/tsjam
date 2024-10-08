/**
 * A codec that encodes/decodes value into/from a byte array
 */
export interface JamCodec<T> {
  /**
   * Encode value into byte array
   * @returns number of written bytes
   */
  encode: (value: T, bytes: Uint8Array) => number;
  /**
   * Decode value from byte array
   * @returns the decoded value and number of read bytes
   */
  decode: (bytes: Uint8Array) => { value: T; readBytes: number };
  /**
   * Compute the size of the encoded value
   */
  encodedSize: (value: T) => number;
}
