import { JamCodec } from "../src/codec.js";
import * as fs from "node:fs";

export const getCodecFixtureFile = (filename: string): Uint8Array => {
  return new Uint8Array(
    fs.readFileSync(
      new URL(`../../../jamtestvectors/codec/data/${filename}`, import.meta.url)
        .pathname,
    ),
  );
};

export const TestOutputCodec = <Error extends number, Output>(
  outputCodec: JamCodec<Output>,
): JamCodec<{ error?: Error; output?: Output }> => {
  const toRet: JamCodec<{ error?: Error; output?: Output }> = {
    encode() {
      throw new Error("Not implemented");
    },
    decode(bytes) {
      if (bytes[0] === 0) {
        const output = outputCodec.decode(bytes.subarray(1));
        return {
          value: { output: output.value },
          readBytes: 1 + output.readBytes,
        };
      } else {
        //
        return {
          value: { error: bytes[1] as Error },
          readBytes: 2,
        };
      }
    },
    encodedSize(value) {
      return (
        1 +
        (typeof value.error !== "undefined"
          ? 1
          : outputCodec.encodedSize(value.output!))
      );
    },
  };
  return toRet;
};
