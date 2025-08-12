import { describe, expect, it } from "vitest";

import { AuthorizerPoolImpl } from "@/classes/authorizer-pool-impl";
import { AuthorizerQueueImpl } from "@/classes/authorizer-queue-impl";
import {
  GuaranteesExtrinsicImpl,
  SingleWorkReportGuaranteeImpl,
} from "@/classes/extrinsics/guarantees";
import { SlotImpl, TauImpl } from "@/classes/slot-impl";
import { WorkReportImpl } from "@/classes/work-report-impl";
import {
  ArrayOfJSONCodec,
  BaseJamCodecable,
  codec,
  createArrayLengthDiscriminator,
  createCodec,
  E_sub_int,
  JamCodecable,
  mapCodec,
  xBytesCodec,
} from "@tsjam/codec";
import { Blake2bHash, CoreIndex, Posterior, Validated } from "@tsjam/types";
import { toTagged } from "@tsjam/utils";
import fs from "node:fs";
import { HashCodec } from "@/codecs/misc-codecs";
import { CORES } from "@tsjam/constants";

export const getCodecFixtureFile = (
  filename: string,
  kind: "full",
): Uint8Array => {
  return new Uint8Array(
    fs.readFileSync(
      new URL(
        `../../../jamtestvectors/stf/authorizations/${kind}/${filename}`,
        import.meta.url,
      ).pathname,
    ),
  );
};

@JamCodecable()
class TestState extends BaseJamCodecable {
  @codec(AuthorizerPoolImpl)
  authPool!: AuthorizerPoolImpl;
  @codec(AuthorizerQueueImpl)
  authQueue!: Posterior<AuthorizerQueueImpl>;
}
@JamCodecable()
class TestInput extends BaseJamCodecable {
  @codec(SlotImpl)
  slot!: Validated<Posterior<TauImpl>>;
  @codec(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <any>mapCodec(
      createArrayLengthDiscriminator<
        Array<{ core: CoreIndex; authHash: Blake2bHash }>
      >(
        createCodec([
          ["core", E_sub_int<CoreIndex>(2)],
          ["authHash", xBytesCodec<Blake2bHash, 32>(32)],
        ]),
      ),
      (a): GuaranteesExtrinsicImpl => {
        return new GuaranteesExtrinsicImpl(
          toTagged(
            a.map((x) => {
              return new SingleWorkReportGuaranteeImpl({
                report: new WorkReportImpl({
                  core: x.core,
                  authorizerHash: x.authHash,
                }),
              });
            }),
          ),
        );
      },
      (_x) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return null as unknown as any;
      },
    ),
  )
  eg!: Validated<GuaranteesExtrinsicImpl>;
}
@JamCodecable()
class Test extends BaseJamCodecable {
  @codec(TestInput)
  input!: TestInput;
  @codec(TestState)
  preState!: TestState;
  @codec(TestState)
  postState!: TestState;
}

describe("authorizations", () => {
  const doTest = (filename: string, kind: "full") => {
    const testBin = fs.readFileSync(
      `${__dirname}/../../../../jamtestvectors/stf/authorizations/${kind}/${filename}.bin`,
    );

    const { value } = Test.decode(testBin);
    const p_pool = value.preState.authPool.toPosterior({
      eg: value.input.eg,
      p_tau: value.input.slot,
      p_queue: value.preState.authQueue,
    });
    expect(value.preState.authQueue, "authQueue is invariant").deep.eq(
      value.postState.authQueue,
    );
    const JC = ArrayOfJSONCodec(HashCodec);
    for (let c = <CoreIndex>0; c < CORES; c++) {
      expect(JC.toJSON(p_pool.elementAt(c)), `pool[${c}]`).deep.eq(
        JC.toJSON(value.postState.authPool.elementAt(c)),
      );
    }
  };
  const set = "full";
  it("progress_authorizations-1", () => {
    doTest("progress_authorizations-1", set);
  });
  it("progress_authorizations-2", () => {
    doTest("progress_authorizations-2", set);
  });
  it("progress_authorizations-3", () => {
    doTest("progress_authorizations-3", set);
  });
});
