import * as fs from "node:fs";
import {
  bigintToBytes,
  hexToBytes,
  hextToBigInt,
  toTagged,
} from "@tsjam/utils";
import {
  AssuranceExtrinsic,
  DisputeExtrinsic,
  EA_Extrinsic,
  EG_Extrinsic,
  RefinementContext,
  SignedJamHeader,
  WorkError,
  WorkItem,
  WorkResult,
  u64,
} from "@tsjam/types";

export const getCodecFixtureFile = (filename: string): Uint8Array => {
  return new Uint8Array(
    fs.readFileSync(
      new URL(`../../../jamtestvectors/codec/data/${filename}`, import.meta.url)
        .pathname,
    ),
  );
};

export const getUTF8FixtureFile = (filename: string): string => {
  return fs.readFileSync(
    new URL(`../../../jamtestvectors/codec/data/${filename}`, import.meta.url)
      .pathname,
    "utf8",
  );
};

export const assurancesExtrinsicFromJSON = (json: any): EA_Extrinsic => {
  return json.map((e: any) => ({
    anchorHash: hextToBigInt(e.anchor),
    // bitstring: [0, 0, 0, 0, 0, 0, 0, 1] as AssuranceExtrinsic["bitstring"],
    bitstring: [1, 0] as AssuranceExtrinsic["bitstring"],
    validatorIndex: e.validator_index,
    signature: hextToBigInt(e.signature) as AssuranceExtrinsic["signature"],
  }));
};

export const guaranteesExtrinsicFromJSON = (json: any): EG_Extrinsic => {
  return json.map((e: any): EG_Extrinsic[0] => ({
    workReport: {
      segmentRootLookup: new Map(),
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
};
export const disputesExtrinsicFromJSON = (json: any): DisputeExtrinsic => {
  return {
    verdicts: json.verdicts.map((v: any) => ({
      hash: hextToBigInt(v.target),
      epochIndex: v.age,
      judgements: v.votes.map((j: any) => {
        return {
          signature: hextToBigInt(j.signature),
          validity: j.vote ? 1 : 0,
          validatorIndex: j.index,
        };
      }),
    })),
    culprit: json.culprits.map((c: any) => ({
      hash: hextToBigInt(c.target),
      ed25519PublicKey: hextToBigInt(c.key),
      signature: hextToBigInt(c.signature),
    })),
    faults: json.faults.map((f: any) => ({
      ed25519PublicKey: hextToBigInt(f.key),
      hash: hextToBigInt(f.target),
      signature: hextToBigInt(f.signature),
      validity: f.vote ? 1 : 0,
    })),
  };
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

export const headerFromJSON = (json: any): SignedJamHeader => {
  return {
    blockAuthorKeyIndex: json.author_index,
    blockSeal: hextToBigInt(json.seal),
    entropySignature: hextToBigInt(json.entropy_source),
    epochMarker: (() => {
      if (!json.epoch_mark) {
        return undefined;
      }
      return {
        entropy: hextToBigInt(json.epoch_mark.entropy),
        entropy2: hextToBigInt(json.epoch_mark.tickets_entropy),
        validatorKeys: json.epoch_mark.validators.map((e: any) =>
          hextToBigInt(e),
        ),
      };
    })(),
    extrinsicHash: hextToBigInt(json.extrinsic_hash),
    offenders: json.offenders_mark.map((e: any) => hextToBigInt(e)),
    parent: hextToBigInt(json.parent),
    priorStateRoot: hextToBigInt(json.parent_state_root),
    timeSlotIndex: json.slot,
    winningTickets: (() => {
      if (!json.tickets_mark) {
        return undefined;
      }
      return json.tickets_mark.map((e: any) => ({
        attempt: e.attempt,
        id: hextToBigInt(e.id),
      }));
    })(),
  };
};
