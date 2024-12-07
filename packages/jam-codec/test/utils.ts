import {
  JamCodec,
  WorkReportCodec,
  E_4_int,
  Optional,
  BandersnatchCodec,
  Ed25519PubkeyCodec,
  IdentityCodec,
  ValidatorDataCodec,
} from "@tsjam/codec";
import { RHO, Tau, ValidatorData, WorkReport } from "@tsjam/types";
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
export const ValidatorsDataCodec = (nValidators: number) => {
  const toRet: JamCodec<ValidatorData[]> = {
    encode(value, bytes) {
      let offset = 0;
      for (let i = 0; i < nValidators; i++) {
        offset += BandersnatchCodec.encode(
          value[i].banderSnatch,
          bytes.subarray(offset),
        );
        offset += Ed25519PubkeyCodec.encode(
          value[i].ed25519,
          bytes.subarray(offset),
        );
        offset += IdentityCodec.encode(value[i].blsKey, bytes.subarray(offset));
        offset += IdentityCodec.encode(
          value[i].metadata,
          bytes.subarray(offset),
        );
      }
      return offset;
    },
    decode(bytes) {
      const toRet = [] as unknown as ValidatorData[];
      let offset = 0;
      for (let i = 0; i < nValidators; i++) {
        const d = ValidatorDataCodec.decode(bytes.subarray(offset));
        toRet.push(d.value);
        offset += d.readBytes;
      }
      return { value: toRet, readBytes: offset };
    },
    encodedSize(value) {
      let size = 0;
      for (let i = 0; i < nValidators; i++) {
        size +=
          BandersnatchCodec.encodedSize(value[i].banderSnatch) +
          Ed25519PubkeyCodec.encodedSize(value[i].ed25519) +
          IdentityCodec.encodedSize(value[i].blsKey) +
          IdentityCodec.encodedSize(value[i].metadata);
      }
      return size;
    },
  };

  return toRet;
};
export const RHOCodec = (cores: number): JamCodec<RHO> => {
  const opt = new Optional(<
    JamCodec<{ workReport: WorkReport; reportTime: Tau }>
  >{
    encode(value, bytes) {
      let offset = 0;
      offset += WorkReportCodec.encode(value.workReport, bytes);

      offset += E_4_int.encode(value.reportTime, bytes.subarray(offset));
      return offset;
    },
    decode(bytes) {
      let offset = 0;
      const workReport = WorkReportCodec.decode(bytes.subarray(offset));
      offset += workReport.readBytes;
      const reportTime = E_4_int.decode(bytes.subarray(offset, offset + 4));
      return {
        value: {
          workReport: workReport.value,
          reportTime: <Tau>reportTime.value,
        },
        readBytes: offset + 4,
      };
    },
    encodedSize(value) {
      return WorkReportCodec.encodedSize(value.workReport) + 4;
    },
  });
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
