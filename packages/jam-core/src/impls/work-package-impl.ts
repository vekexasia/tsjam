import { hostFunctions } from "@/pvm/functions/functions";
import { applyMods } from "@/pvm/functions/utils";
import { IxMod } from "@/pvm/instructions/utils";
import { argumentInvocation } from "@/pvm/invocations/argument";
import { HostCallExecutor } from "@/pvm/invocations/host-call";
import {
  ArrayOfJSONCodec,
  BaseJamCodecable,
  binaryCodec,
  codec,
  createArrayLengthDiscriminator,
  E_2_int,
  encodeWithCodec,
  eSubIntCodec,
  JamCodecable,
  jsonCodec,
  LengthDiscrimantedIdentityCodec,
} from "@tsjam/codec";
import {
  HostCallResult,
  MAXIMUM_SIZE_IS_AUTHORIZED,
  MAXIMUM_WORK_ITEMS,
  TOTAL_GAS_IS_AUTHORIZED,
} from "@tsjam/constants";
import { Hashing } from "@tsjam/crypto";
import {
  Authorization,
  AuthorizationParams,
  Blake2bHash,
  BoundedSeq,
  CodeHash,
  CoreIndex,
  Gas,
  PVMProgramCode,
  PVMResultContext,
  ServiceIndex,
  u32,
  WorkError,
  WorkPackage,
  WorkPackageHash,
} from "@tsjam/types";
import { toTagged } from "@tsjam/utils";
import type { DeltaImpl } from "./delta-impl";
import { WorkContextImpl } from "./work-context-impl";
import { WorkItemImpl } from "./work-item-impl";
import { WorkOutputImpl } from "./work-output-impl";
import { HashCodec } from "@/codecs/misc-codecs";

/**
 * Identified by `P` set
 * $(0.7.1 - 14.2)
 * codec order defined in $(0.7.1 - C.28)
 */
@JamCodecable()
export class WorkPackageImpl extends BaseJamCodecable implements WorkPackage {
  /**
   * `h` - index of the service that hosts the authorization code
   */
  @eSubIntCodec(4, "auth_code_host")
  authCodeHost!: ServiceIndex;

  /**
   * `u` - authorization code hash
   */
  @codec(HashCodec, "auth_code_hash")
  authCodeHash!: CodeHash;

  /**
   * `bold c` - context
   */
  @codec(WorkContextImpl)
  context!: WorkContextImpl;

  /**
   * `j`
   */
  @codec(LengthDiscrimantedIdentityCodec, "authorization")
  authToken!: Authorization;

  /**
   * `bold f` - configuration blob
   */
  @codec(LengthDiscrimantedIdentityCodec, "authorizer_config")
  authConfig!: AuthorizationParams;

  /**
   * `bold w` - sequence of work items
   */
  @jsonCodec(ArrayOfJSONCodec(WorkItemImpl), "items")
  @binaryCodec(createArrayLengthDiscriminator(WorkItemImpl))
  workItems!: BoundedSeq<WorkItemImpl, 1, typeof MAXIMUM_WORK_ITEMS>;

  hash(): WorkPackageHash {
    return Hashing.blake2b(this.toBinary());
  }
  /**
   * `p_a`
   * $(0.7.1 - 14.10)
   */
  authorizer(): Blake2bHash {
    return Hashing.blake2b(
      new Uint8Array([
        ...encodeWithCodec(HashCodec, this.authCodeHash),
        ...this.authConfig,
      ]),
    );
  }

  /**
   * $(0.7.1 - 14.10)
   */
  #metaAndCode(delta: DeltaImpl) {
    const encodedData = delta
      .get(this.authCodeHost)!
      .historicalLookup(
        toTagged(this.context.lookupAnchorSlot),
        this.authCodeHash,
      )!;

    const { value: metadata, readBytes: skip } =
      LengthDiscrimantedIdentityCodec.decode(encodedData);

    const code = encodedData.slice(skip);
    return { metadata, code };
  }

  /**
   * `p_{bold_u}`
   */
  code(delta: DeltaImpl) {
    return <PVMProgramCode>this.#metaAndCode(delta).code;
  }

  /**
   * `p_{bold_m}`
   */
  metadata(delta: DeltaImpl) {
    return this.#metaAndCode(delta).metadata;
  }

  /**
   * $(0.7.1 - B.1)
   */
  isAuthorized(
    c: CoreIndex,
    deps: { delta: DeltaImpl },
  ): {
    res: WorkOutputImpl<
      WorkError.Bad | WorkError.Big | WorkError.OutOfGas | WorkError.Panic
    >;
    gasUsed: Gas;
  } {
    const code = this.code(deps.delta);
    if (code.length === 0) {
      return { res: WorkOutputImpl.bad(), gasUsed: <Gas>0n };
    }
    if (code.length > MAXIMUM_SIZE_IS_AUTHORIZED) {
      return { res: WorkOutputImpl.big(), gasUsed: <Gas>0n };
    }

    const res = argumentInvocation(
      code,
      0 as u32, // instruction pointer
      TOTAL_GAS_IS_AUTHORIZED as Gas,
      encodeWithCodec(E_2_int, c),
      F_Fn(this),
      undefined as unknown as PVMResultContext, // something is missing from the paper
    );

    return {
      /**
       * `bold_t`
       */
      res: res.res,
      /**
       * `g`
       */
      gasUsed: res.gasUsed,
    };
  }
}

// $(0.7.1 - B.2)
const F_Fn =
  (bold_p: WorkPackageImpl): HostCallExecutor<unknown> =>
  (input) => {
    if (input.hostCallOpcode === 0 /** ΩG */) {
      return applyMods(
        input.ctx,
        input.out as never,
        hostFunctions.gas(input.ctx, undefined),
      );
    } else if (input.hostCallOpcode === 1 /** fetc */) {
      return applyMods(
        input.ctx,
        input.out as never,
        hostFunctions.fetch(input.ctx, {
          p: bold_p,
        }),
      );
    }
    return applyMods(input.ctx, input.out as never, [
      IxMod.gas(10n),
      IxMod.reg(7, HostCallResult.WHAT),
    ]);
  };

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;
  const { getCodecFixtureFile } = await import("@/test/codec-utils.js");
  describe("WorkPackageImpl codec", () => {
    it("should encode/decode properly", () => {
      const bin = getCodecFixtureFile("work_package.bin");
      const decoded = WorkPackageImpl.decode(bin);
      const reencoded = decoded.value.toBinary();
      expect(Buffer.from(reencoded).toString("hex")).toBe(
        Buffer.from(bin).toString("hex"),
      );
    });
    it("should encode/decode from JSON", () => {
      const json = JSON.parse(
        Buffer.from(getCodecFixtureFile("work_package.json")).toString("utf8"),
      );
      const decoded = WorkPackageImpl.fromJSON(json);
      const reencoded = decoded.toJSON();
      expect(reencoded).toEqual(json);
    });
  });
}
