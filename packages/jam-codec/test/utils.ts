import { createCodec } from "@tsjam/codec";
import { JamCodec, WorkReportCodec, Optional, E_sub_int } from "@tsjam/codec";
import { RHO, Tau, WorkReport } from "@tsjam/types";
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

export const RHOCodec = (cores: number): JamCodec<RHO> => {
  const opt = new Optional(
    createCodec<{ workReport: WorkReport; reportTime: Tau }>([
      ["workReport", WorkReportCodec],
      ["reportTime", E_sub_int<Tau>(4)],
    ]),
  );
  const toRet: JamCodec<RHO> = {
    encode(value, bytes) {
      let offset = 0;
      for (let i = 0; i < cores; i++) {
        offset += opt.encode(value[i], bytes.subarray(offset));
      }
      return offset;
    },
    decode(bytes) {
      const toRet = [] as unknown as RHO;
      let offset = 0;
      for (let i = 0; i < cores; i++) {
        const { value, readBytes } = opt.decode(bytes.subarray(offset));
        offset += readBytes;
        toRet.push(value);
      }
      return { value: toRet, readBytes: offset };
    },
    encodedSize(value) {
      let size = 0;
      for (let i = 0; i < cores; i++) {
        size += opt.encodedSize(value[i]);
      }
      return size;
    },
  };
  return toRet;
};
