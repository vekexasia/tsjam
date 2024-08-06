/**
 * # WARNING #
 * This is not working code, but a sketch of what a codec builder might look like
 */
import { JamCodec } from "@/codec.js";
import { LittleEndian } from "@/ints/littleEndian.js";

export enum CodecInstructionType {
  LITTLE_ENDIAN,
  CARDINALITY,
  SEQUENCE,
}
export type CodecInstruction<T, K extends keyof T = keyof T> = {
  type: CodecInstructionType;
  args: Array<unknown>;
  key: K;
};
export const codecBuilder = <T>(
  config: Array<CodecInstruction<T>>,
): JamCodec<T> => {
  return {
    decode: (bytes: Uint8Array) => {
      const obj = {} as T;
      let offset = 0;
      for (const op of config) {
        switch (op.type) {
          case CodecInstructionType.CARDINALITY:
          case CodecInstructionType.LITTLE_ENDIAN: {
            const numBytes = op.args[0] as number;
            const d = LittleEndian.decode(
              bytes.subarray(offset, offset + numBytes),
            );
            offset += d.readBytes;
            // @ts-expect-error yes, we know that this is a valid key
            obj[op.key] = d.value;
            break;
          }
          case CodecInstructionType.CARDINALITY: {
            const numBytes = op.args[0] as number;

            break;
          }
          case CodecInstructionType.SEQUENCE: {
            break;
          }
        }
      }
      return { value: {} as T, readBytes: 0 };
    },
    encode: (value: T, bytes: Uint8Array) => {
      return 0;
    },
    encodedSize: (value: T) => {
      return 0;
    },
  };
};
