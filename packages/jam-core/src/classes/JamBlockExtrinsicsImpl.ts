import {
  JamCodecable,
  BaseJamCodecable,
  codec,
  createArrayLengthDiscriminator,
  createCodec,
  E_sub_int,
  Ed25519SignatureCodec,
  encodeWithCodec,
  HashCodec,
  JamCodec,
} from "@tsjam/codec";
import {
  EG_Extrinsic,
  Hash,
  JamBlockExtrinsics,
  Tau,
  u32,
  ValidatorIndex,
  WorkReport,
} from "@tsjam/types";
import { TicketsExtrinsicImpl } from "./extrinsics/tickets";
import { PreimagesExtrinsicImpl } from "./extrinsics/preimages";
import { DisputeExtrinsicImpl } from "./extrinsics/disputes";
import {
  GuaranteesExtrinsicImpl,
  SingleWorkReportGuaranteeImpl,
} from "./extrinsics/guarantees";
import { AssurancesExtrinsicImpl } from "./extrinsics/assurances";
import { Hashing } from "@tsjam/crypto";
import { WorkReportImpl } from "./WorkReportImpl";

@JamCodecable() // $(0.7.0 - C.16)
export class JamBlockExtrinsicsImpl
  extends BaseJamCodecable
  implements JamBlockExtrinsics
{
  /**
   * `Et` - Tickets, used for the mechanism which manages the selection of validators for the permissioning of block authoring.
   */
  @codec(TicketsExtrinsicImpl)
  tickets!: TicketsExtrinsicImpl;

  /**
   * `Ep` - Static data which is presently being requested to be available for workloads to be able to fetch on demand
   */
  @codec(PreimagesExtrinsicImpl)
  preimages!: PreimagesExtrinsicImpl;

  /**
   * `Eg`
   * Reports of newly completed workloads
   * whose accuracy is guaranteed by specific validators. This is denoted `EG`.
   */
  @codec(GuaranteesExtrinsicImpl, "guarantees")
  reportGuarantees!: GuaranteesExtrinsicImpl;

  /**
   * `Ea`
   * Assurances by each validator concerning which of the input data of workloads they have
   * correctly received and are storing locally. This is
   * denoted `Ea`.
   * anchored on the parent and ordered by `AssuranceExtrinsic.validatorIndex`
   */
  @codec(AssurancesExtrinsicImpl)
  assurances!: AssurancesExtrinsicImpl;

  /**
   * `Ed` - votes by validators on dispute(s) arising between them presently taking place.
   */
  @codec(DisputeExtrinsicImpl)
  disputes!: DisputeExtrinsicImpl;

  /**
   * computes the Extrinsic hash as defined in
   * $(0.7.1 - 5.4 / 5.5 / 5.6)
   */
  extrinsicHash(): Hash {
    const items = [
      ...Hashing.blake2bBuf(this.tickets.toBinary()),
      ...Hashing.blake2bBuf(this.preimages.toBinary()),
      ...Hashing.blake2bBuf(
        encodeWithCodec(codec_Eg_4Hx, this.reportGuarantees.elements),
      ),
      ...Hashing.blake2bBuf(this.assurances.toBinary()),
      ...Hashing.blake2bBuf(this.disputes.toBinary()),
    ];
    const preimage = new Uint8Array(items);
    return Hashing.blake2b(preimage);
  }
}

/*
 * $(0.7.1 - 5.6)
 */
export const codec_Eg_4Hx = createArrayLengthDiscriminator<
  GuaranteesExtrinsicImpl["elements"]
>(
  createCodec<SingleWorkReportGuaranteeImpl>([
    [
      "report",
      <JamCodec<WorkReportImpl>>{
        encode(w, buf) {
          return HashCodec.encode(w.hash(), buf);
        },
        decode() {
          throw new Error("codec_Eg_4Hx should not be used for decoding");
        },
        encodedSize() {
          return 32;
        },
      },
    ],
    ["slot", E_sub_int<Tau>(4)],
    [
      "signatures",
      createArrayLengthDiscriminator<
        SingleWorkReportGuaranteeImpl["signatures"]
      >(
        createCodec([
          ["validatorIndex", E_sub_int<ValidatorIndex>(2)],
          ["signature", Ed25519SignatureCodec],
        ]),
      ),
    ],
  ]),
);
if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  const { getCodecFixtureFile } = await import("@/test/codec_utils.js");
  describe("JamBlockExtrinsicsImpl", () => {
    it("extrinsic.bin", () => {
      const bin = getCodecFixtureFile("extrinsic.bin");
      const { value: header } = JamBlockExtrinsicsImpl.decode(bin);
      expect(Buffer.from(header.toBinary()).toString("hex")).toBe(
        Buffer.from(bin).toString("hex"),
      );
    });
    it("extrinsic.json", () => {
      const json = JSON.parse(
        Buffer.from(getCodecFixtureFile("extrinsic.json")).toString("utf8"),
      );
      const eg: JamBlockExtrinsicsImpl = JamBlockExtrinsicsImpl.fromJSON(json);

      expect(eg.toJSON()).to.deep.eq(json);
    });
  });
}
