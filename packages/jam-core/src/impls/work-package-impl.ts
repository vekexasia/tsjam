import { HashCodec } from "@/codecs/misc-codecs";
import { hostFunctions } from "@/pvm/functions/functions";
import { applyMods } from "@/pvm/functions/utils";
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
  MAX_SIZE_ENCODED_PACKAGE,
  MAXIMUM_SIZE_IS_AUTHORIZED,
  MAXIMUM_WORK_ITEMS,
  TOTAL_GAS_ACCUMULATION_LOGIC,
  TOTAL_GAS_IS_AUTHORIZED,
  TOTAL_GAS_REFINEMENT_LOGIC,
} from "@tsjam/constants";
import { Hashing } from "@tsjam/crypto";
import type {
  Authorization,
  AuthorizationParams,
  Blake2bHash,
  BoundedSeq,
  CodeHash,
  CoreIndex,
  Gas,
  PVMProgramCode,
  PVMRegisterRawValue,
  PVMResultContext,
  ServiceIndex,
  u32,
  Validated,
  WorkError,
  WorkPackage,
  WorkPackageHash,
} from "@tsjam/types";
import { toTagged } from "@tsjam/utils";
import type { DeltaImpl } from "./delta-impl";
import { WorkContextImpl } from "./work-context-impl";
import { WorkItemImpl } from "./work-item-impl";
import { WorkOutputImpl } from "./work-output-impl";
import { PVMExitReasonImpl } from "@tsjam/pvm-base";

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
    const b = Buffer.allocUnsafe(32 + this.authConfig.length);
    this.authCodeHash.copy(b, 0);
    this.authConfig.copy(b, 32);
    return Hashing.blake2b(b);
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
      F_Fn(this, c),
      undefined as unknown as PVMResultContext, // something is missing from the paper
      () => {},
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

  validate(): this is Validated<WorkPackageImpl> {
    // $(0.7.1 - 14.5) |check on the encoded size
    if (
      this.authToken.length +
        this.authConfig.length +
        this.workItems.map((w) => w.encodedSize()).reduce((a, b) => a + b, 0) >
      MAX_SIZE_ENCODED_PACKAGE
    ) {
      return false;
    }

    // check gas limits
    // $(0.7.1 - 14.8)
    if (
      this.workItems
        .map((w) => w.accumulateGasLimit)
        .reduce((a, b) => a + b, 0n) >= TOTAL_GAS_ACCUMULATION_LOGIC
    ) {
      return false;
    }

    //
    if (
      this.workItems.map((w) => w.refineGasLimit).reduce((a, b) => a + b, 0n) >=
      TOTAL_GAS_REFINEMENT_LOGIC
    ) {
      return false;
    }

    return true;
  }
}

// $(0.7.2 - B.2)
const F_Fn =
  (bold_p: WorkPackageImpl, coreIndex: CoreIndex): HostCallExecutor<unknown> =>
  (input) => {
    if (input.hostCallOpcode === 0 /** ΩG */) {
      return applyMods(
        input.pvm,
        input.out as never,
        hostFunctions.gas(input.pvm, undefined),
      );
    } else if (input.hostCallOpcode === 1 /** fetc */) {
      return applyMods(
        input.pvm,
        input.out as never,
        hostFunctions.fetch(input.pvm, {
          p: bold_p,
        }),
      );
    } else if (input.hostCallOpcode === 100 /** log */) {
      hostFunctions.log(input.pvm, { core: coreIndex });
    }
    input.pvm.gas = <Gas>(input.pvm.gas - 10n);
    input.pvm.registers.w7().value = <PVMRegisterRawValue>HostCallResult.WHAT;
    if (input.pvm.gas < 0n) {
      return PVMExitReasonImpl.outOfGas();
    }
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
