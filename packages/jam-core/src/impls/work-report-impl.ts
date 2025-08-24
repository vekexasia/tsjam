import {
  ArrayOfJSONCodec,
  BaseJamCodecable,
  BigIntJSONCodec,
  binaryCodec,
  codec,
  createArrayLengthDiscriminator,
  E,
  E_int,
  JamCodecable,
  jsonCodec,
  LengthDiscrimantedIdentityCodec,
  NumberJSONCodec,
} from "@tsjam/codec";
import { CORES, MAXIMUM_WORK_ITEMS } from "@tsjam/constants";
import type {
  Blake2bHash,
  BoundedSeq,
  CoreIndex,
  Gas,
  Hash,
  SeqOfLength,
  Tagged,
  WorkPackageHash,
  WorkReport,
} from "@tsjam/types";
import { AvailabilitySpecificationImpl } from "./availability-specification-impl";
import { WorkContextImpl } from "./work-context-impl";
import { WorkDigestImpl } from "./work-digest-impl";
import type { RHOImpl } from "./rho-impl";
import { Hashing } from "@tsjam/crypto";
import type { NewWorkReportsImpl } from "./new-work-reports-impl";
import { ConditionalExcept } from "type-fest";
import { HashCodec } from "@/codecs/misc-codecs";
import { IdentityMap, IdentityMapCodec } from "@/data-structures/identity-map";
import { IdentitySet } from "@/data-structures/identity-set";

/**
 * Identified by `R` set
 * @see $(0.7.1 - 11.2)
 * codec order defined in $(0.7.1 - C.27)
 */
@JamCodecable()
export class WorkReportImpl extends BaseJamCodecable implements WorkReport {
  /**
   * `bold_s`
   */
  @codec(AvailabilitySpecificationImpl, "package_spec")
  avSpec!: AvailabilitySpecificationImpl;

  /**
   * `bold_c`
   */
  @codec(WorkContextImpl)
  context!: WorkContextImpl;

  /**
   * `c`
   */
  @jsonCodec(NumberJSONCodec(), "core_index")
  @binaryCodec(E_int())
  core!: CoreIndex;

  /**
   * `a`
   */
  @codec(HashCodec, "authorizer_hash")
  authorizerHash!: Blake2bHash;

  /**
   * `g`
   */
  @jsonCodec(BigIntJSONCodec(), "auth_gas_used")
  @binaryCodec(E)
  authGasUsed!: Gas;

  /**
   * `bold_t`
   */
  @codec(LengthDiscrimantedIdentityCodec, "auth_output")
  authTrace!: Uint8Array;

  /**
   * `bold_l`
   */
  @codec(
    IdentityMapCodec(HashCodec, HashCodec, {
      key: "work_package_hash",
      value: "segment_tree_root",
    }),
    "segment_root_lookup",
  )
  srLookup!: IdentityMap<WorkPackageHash, 32, Hash>;

  /**
   * `bold_d`
   */
  @jsonCodec(ArrayOfJSONCodec(WorkDigestImpl), "results")
  @binaryCodec(createArrayLengthDiscriminator(WorkDigestImpl))
  digests!: BoundedSeq<WorkDigestImpl, 1, typeof MAXIMUM_WORK_ITEMS>;

  constructor(config?: Partial<ConditionalExcept<WorkReportImpl, Function>>) {
    super();
    if (typeof config !== "undefined") {
      Object.assign(this, config);
    }
  }

  hash() {
    return Hashing.blake2b(this.toBinary());
  }

  /**
   * `P()`
   * $(0.7.1 - 12.9)
   * compute the package haches of the given work reports
   */
  static extractWorkPackageHashes(
    r: WorkReportImpl[],
  ): IdentitySet<WorkPackageHash> {
    return new IdentitySet(r.map((wr) => wr.avSpec.packageHash));
  }

  /**
   * Comutes `bold q` in thye paper which is the sequence of work reports which may be required
   * to be audited by the validator
   * $(0.7.1 - 17.2)
   */
  static computeRequiredWorkReports(
    rho: RHOImpl,
    bold_w: NewWorkReportsImpl,
  ): AuditRequiredWorkReports {
    const toRet = [] as unknown[] as AuditRequiredWorkReports;

    const wSet = new Set(bold_w.elements.map((wr) => wr.hash()));

    for (let c = <CoreIndex>0; c < CORES; c++) {
      const rc = rho.elementAt(c);
      if (rc && wSet.has(rc.workReport.hash())) {
        toRet.push(rc.workReport);
      } else {
        toRet.push(undefined);
      }
    }
    return toRet;
  }
}

/**
 * `bold R*` in the paper
 * $(0.7.1 - 12.11)
 */
export type AccumulatableWorkReports = Tagged<WorkReportImpl[], "R*">;
/**
 * `bold q`
 * $(0.7.1 - 17.1)
 */
export type AuditRequiredWorkReports = SeqOfLength<
  WorkReportImpl | undefined,
  typeof CORES
>;
if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  const { getCodecFixtureFile } = await import("@/test/codec-utils.js");

  describe("WorkReportImpl", () => {
    describe("codec", () => {
      it("should encode/decode binary", () => {
        const bin = getCodecFixtureFile("work_report.bin");
        const value = WorkReportImpl.decode(bin).value;
        const reencoded = value.toBinary();
        expect(Buffer.from(reencoded).toString("hex")).toEqual(
          Buffer.from(bin).toString("hex"),
        );
      });
      it("should encode/decode json", () => {
        const json = JSON.parse(
          Buffer.from(getCodecFixtureFile("work_report.json")).toString("utf8"),
        );
        const decoded = WorkReportImpl.fromJSON(json).toJSON();
        expect(decoded).deep.eq(json);
      });
    });
  });
}
