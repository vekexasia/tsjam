import * as fs from "node:fs";
import { hexToBytes, hextToBigInt, toTagged } from "@vekexasia/jam-utils";
import {
  RefinementContext,
  WorkError,
  WorkItem,
  WorkResult,
  u64,
} from "@vekexasia/jam-types";

export const getCodecFixtureFile = (filename: string): Uint8Array => {
  return new Uint8Array(
    fs.readFileSync(
      new URL(`./fixtures/${filename}`, import.meta.url).pathname,
    ),
  );
};

export const getUTF8FixtureFile = (filename: string): string => {
  return fs.readFileSync(
    new URL(`./fixtures/${filename}`, import.meta.url).pathname,
    "utf8",
  );
};

export const workItemFromJSON = (json: any): WorkItem => {
  return {
    serviceIndex: json.service,
    codeHash: hextToBigInt(json.code_hash),
    payload: hexToBytes(json.payload),
    gasLimit: toTagged(BigInt(json.gas_limit)),
    importedDataSegments: json.import_segments.map((e: any) => {
      return {
        root: hextToBigInt(e.tree_root),
        index: e.index,
      };
    }),
    exportedDataSegments: json.extrinsic.map((e: any) => {
      return {
        blobHash: hextToBigInt(e.hash),
        length: e.len,
      };
    }),
    numberExportedSegments: json.export_count,
  };
};

export const contextFromJSON = (json: any): RefinementContext => {
  return {
    anchor: {
      headerHash: hextToBigInt(json.anchor),
      posteriorStateRoot: hextToBigInt(json.state_root),
      posteriorBeefyRoot: hextToBigInt(json.beefy_root),
    },
    lookupAnchor: {
      headerHash: hextToBigInt(json.lookup_anchor),
      timeSlot: json.lookup_anchor_slot,
    },
    requiredWorkPackage: undefined,
  };
};

export const workResultFromJSON = (r: any): WorkResult => {
  return {
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
  };
};
