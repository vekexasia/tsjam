import {
  E_2,
  E_4,
  Ed25519SignatureCodec,
  JamCodec,
  bytesToBigInt,
  createArrayLengthDiscriminator,
} from "@vekexasia/jam-codec";
import {
  EG_Extrinsic,
  ValidatorIndex,
  WorkError,
  WorkResult,
  u32,
  u64,
} from "@vekexasia/jam-types";
import { WorkReportCodec } from "@/sets/index.js";

const signaturesCodec = createArrayLengthDiscriminator<
  EG_Extrinsic[0]["credential"][0]
>({
  encode(value: EG_Extrinsic[0]["credential"][0], bytes: Uint8Array): number {
    let offset = E_2.encode(BigInt(value.validatorIndex), bytes.subarray(0, 2));
    offset += Ed25519SignatureCodec.encode(
      value.signature,
      bytes.subarray(offset, offset + 64),
    );
    return offset;
  },
  decode(bytes: Uint8Array): {
    value: EG_Extrinsic[0]["credential"][0];
    readBytes: number;
  } {
    const validatorIndex = E_2.decode(bytes);
    const signature = Ed25519SignatureCodec.decode(
      bytes.subarray(validatorIndex.readBytes),
    );
    return {
      value: {
        validatorIndex: Number(validatorIndex.value) as ValidatorIndex,
        signature: signature.value,
      },
      readBytes: validatorIndex.readBytes + signature.readBytes,
    };
  },
  encodedSize: function (value: EG_Extrinsic[0]["credential"][0]): number {
    return (
      E_2.encodedSize(BigInt(value.validatorIndex)) +
      Ed25519SignatureCodec.encodedSize(value.signature)
    );
  },
});
const codecSingleGuarantee: JamCodec<EG_Extrinsic[0]> = {
  encode(value: EG_Extrinsic[0], bytes: Uint8Array): number {
    let offset = WorkReportCodec.encode(value.workReport, bytes);
    offset += E_4.encode(
      BigInt(value.timeSlot),
      bytes.subarray(offset, offset + 4),
    );
    offset += signaturesCodec.encode(value.credential, bytes.subarray(offset));
    return offset;
  },
  decode(bytes: Uint8Array): {
    value: EG_Extrinsic[0];
    readBytes: number;
  } {
    const workReport = WorkReportCodec.decode(bytes);
    const timeSlot = E_4.decode(bytes.subarray(workReport.readBytes));
    const credential = signaturesCodec.decode(
      bytes.subarray(workReport.readBytes + timeSlot.readBytes),
    );
    return {
      value: {
        workReport: workReport.value,
        timeSlot: Number(timeSlot.value) as u32,
        credential: credential.value as EG_Extrinsic[0]["credential"],
      },
      readBytes:
        workReport.readBytes + timeSlot.readBytes + credential.readBytes,
    };
  },
  encodedSize: function (value: EG_Extrinsic[0]): number {
    return (
      WorkReportCodec.encodedSize(value.workReport) +
      E_4.encodedSize(BigInt(value.timeSlot)) +
      signaturesCodec.encodedSize(value.credential)
    );
  },
};

export const codecEG_Extrinsic = createArrayLengthDiscriminator<
  EG_Extrinsic[0]
>(codecSingleGuarantee) as unknown as JamCodec<EG_Extrinsic>;

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;
  const fs = await import("fs");

  const path = await import("path");
  describe("codecEg", () => {
    const bin = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../../test/fixtures/guarantees_extrinsic.bin",
      ),
    );
    const json = JSON.parse(
      fs.readFileSync(
        path.resolve(
          __dirname,
          "../../../test/fixtures/guarantees_extrinsic.json",
        ),
        "utf8",
      ),
    );
    const hexToBytes = (hex: string): Uint8Array => {
      return Buffer.from(hex.slice(2), "hex");
    };
    const hextToBigInt = <T extends bigint>(hex: string): T => {
      return bytesToBigInt(hexToBytes(hex)) as unknown as T;
    };
    it.fails(
      "guarantees_extrinsic.json encoded should match guarantees_extrinsic.bin",
      () => {
        const ea: EG_Extrinsic = json.map((e: any): EG_Extrinsic[0] => ({
          workReport: {
            workPackageSpecification: {
              workPackageHash: hextToBigInt(e.report.package_spec.hash),
              bundleLength: e.report.package_spec.len,
              erasureRoot: hextToBigInt(e.report.package_spec.root),
              segmentRoot: hextToBigInt(e.report.package_spec.segments),
            },
            refinementContext: {
              anchor: {
                headerHash: hextToBigInt(e.report.context.anchor),
                posteriorStateRoot: hextToBigInt(e.report.context.state_root),
                posteriorBeefyRoot: hextToBigInt(e.report.context.beefy_root),
              },
              lookupAnchor: {
                headerHash: hextToBigInt(e.report.context.lookup_anchor),
                timeSlot: e.report.context.lookup_anchor_slot,
              },
              requiredWorkPackage: e.report.context.prerequisite || undefined,
            },
            coreIndex: e.report.core_index,
            authorizerHash: hextToBigInt(e.report.authorizer_hash),
            authorizerOutput: hexToBytes(e.report.auth_output),
            results: e.report.results.map(
              (r: any): WorkResult => ({
                serviceIndex: r.service,
                codeHash: hextToBigInt(r.code_hash),
                payloadHash: hextToBigInt(r.payload_hash),
                gasPrioritization: BigInt(r.gas_ratio) as u64,
                output: (() => {
                  if (r.result.ok) {
                    return hexToBytes(r.result.ok);
                  }

                  if ("out_of_gas" in r.result) {
                    return WorkError.OutOfGas;
                  }
                  if ("panic" in r.result) {
                    return WorkError.UnexpectedTermination;
                  }
                  throw new Error("pd");
                })(),
              }),
            ),
          },
          timeSlot: e.slot,
          credential: e.signatures.map(
            (s: any): EG_Extrinsic[0]["credential"][0] => ({
              validatorIndex: s.validator_index,
              signature: hextToBigInt(s.signature),
            }),
          ),
        }));
        const b = new Uint8Array(bin.length);
        codecEG_Extrinsic.encode(ea, b);
        expect(codecEG_Extrinsic.encodedSize(ea)).toBe(bin.length);
        expect(Buffer.from(b).toString("hex")).toBe(bin.toString("hex"));
        // check decode now
        const x = codecEG_Extrinsic.decode(b);
        expect(x.value).toEqual(ea);
      },
    );
  });
}
