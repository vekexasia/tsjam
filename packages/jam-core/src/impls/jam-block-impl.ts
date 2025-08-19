import { BaseJamCodecable, codec, JamCodecable } from "@tsjam/codec";
import { BandersnatchKey, JamBlock, Posterior, Validated } from "@tsjam/types";
import { err, ok, Result } from "neverthrow";
import { ConditionalExcept } from "type-fest";
import { DisputesToPosteriorError } from "./disputes-state-impl";
import { JamBlockExtrinsicsImpl } from "./jam-block-extrinsics-impl";
import {
  HeaderCreationError,
  JamSignedHeaderImpl,
} from "./jam-signed-header-impl";
import type { JamStateImpl } from "./jam-state-impl";
import { TauImpl } from "./slot-impl";
import { HeaderOffenderMarkerImpl } from "./header-offender-marker-impl";

/**
 * codec: $(0.7.1 - C.16)
 */
@JamCodecable()
export class JamBlockImpl extends BaseJamCodecable implements JamBlock {
  @codec(JamSignedHeaderImpl)
  header!: JamSignedHeaderImpl;

  @codec(JamBlockExtrinsicsImpl, "extrinsic")
  extrinsics!: JamBlockExtrinsicsImpl;

  constructor(config?: ConditionalExcept<JamBlockImpl, Function>) {
    super();
    if (config) {
      Object.assign(this, config);
    }
  }

  /**
   * Creates a new block given the computed extrinsics
   */
  static newEmpty(
    curState: JamStateImpl,
    p_tau: Validated<Posterior<TauImpl>>,
    extrinsics: JamBlockExtrinsicsImpl,
    keyPair: { private: BandersnatchKey; public: BandersnatchKey },
  ): Result<JamBlockImpl, DisputesToPosteriorError | HeaderCreationError> {
    const [hErr, header] = curState
      .block!.header.buildNext(curState, extrinsics, p_tau, keyPair)
      .safeRet();
    if (hErr) {
      return err(hErr);
    }

    return ok(
      new JamBlockImpl({
        extrinsics,
        header,
      }),
    );
  }
}

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  const { getCodecFixtureFile } = await import("@/test/codec-utils.js");
  describe("JamBlockImpl", () => {
    it("block.bin", () => {
      const bin = getCodecFixtureFile("block.bin");
      const { value: header } = JamBlockImpl.decode(bin);
      expect(Buffer.from(header.toBinary()).toString("hex")).toBe(
        Buffer.from(bin).toString("hex"),
      );
    });
    it("block.json", () => {
      const json = JSON.parse(
        Buffer.from(getCodecFixtureFile("block.json")).toString("utf8"),
      );
      const block: JamBlockImpl = JamBlockImpl.fromJSON(json);
      expect(block.toJSON()).to.deep.eq(json);
    });
  });
}
