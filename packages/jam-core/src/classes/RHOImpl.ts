import { IdentitySet } from "@/data_structures/identitySet";
import {
  ArrayOfJSONCodec,
  BaseJamCodecable,
  binaryCodec,
  cloneCodecable,
  codec,
  createSequenceCodec,
  JamCodecable,
  jsonCodec,
  NULLORCodec,
  Optional,
  SINGLE_ELEMENT_CLASS,
} from "@tsjam/codec";
import { CORES, WORK_TIMEOUT } from "@tsjam/constants";
import {
  CoreIndex,
  Dagger,
  DoubleDagger,
  Posterior,
  RHO,
  RHOElement,
  SeqOfLength,
  Validated,
} from "@tsjam/types";
import { toDagger, toDoubleDagger, toPosterior } from "@tsjam/utils";
import assert from "assert";
import { ConditionalExcept } from "type-fest";
import { DisputesStateImpl } from "./DisputesStateImpl";
import { GuaranteesExtrinsicImpl } from "./extrinsics/guarantees";
import { NewWorkReportsImpl } from "./NewWorkReportsImpl";
import { SlotImpl, TauImpl } from "./SlotImpl";
import { WorkReportImpl } from "./WorkReportImpl";

@JamCodecable()
export class RHOElementImpl extends BaseJamCodecable implements RHOElement {
  /** `bold_r`
   */
  @codec(WorkReportImpl, "report")
  workReport!: WorkReportImpl;
  /**
   * `t`
   */
  @codec(SlotImpl, "timeout")
  reportSlot!: SlotImpl;

  constructor(config?: ConditionalExcept<RHOElementImpl, Function>) {
    super();
    if (typeof config !== "undefined") {
      Object.assign(this, config);
    }
  }
}

@JamCodecable()
export class RHOImpl extends BaseJamCodecable implements RHO {
  @jsonCodec(
    ArrayOfJSONCodec(NULLORCodec(RHOElementImpl)),
    SINGLE_ELEMENT_CLASS,
  )
  @binaryCodec(createSequenceCodec(CORES, new Optional(RHOElementImpl)))
  elements!: SeqOfLength<RHOElementImpl | undefined, typeof CORES>;

  constructor(config?: ConditionalExcept<RHOImpl, Function>) {
    super();
    if (typeof config !== "undefined") {
      Object.assign(this, config);
    }
  }

  elementAt(core: CoreIndex): RHOElementImpl | undefined {
    assert(core >= 0 && core < CORES, "Core index out of bounds");
    return this.elements[core];
  }

  /**
   * Input should be the newly added hashes to phi_b and phi_w
   * $(0.7.1 - 10.15)
   */
  toDagger(deps: {
    p_disputes: Posterior<DisputesStateImpl>;
  }): Dagger<RHOImpl> {
    // NOTE: Andrea this is correct bad contains votes = 0 and wonky < 2/3+1
    // it does change from gp but we assume that if it was already present then
    // rho would have it cleared for the core
    // so this is basically doing the t < 2/3V check
    const sets = new IdentitySet([
      ...deps.p_disputes.bad,
      ...deps.p_disputes.wonky,
    ]);

    const rho_dagger: RHOImpl = cloneCodecable(this);
    this.elements.forEach((rho_c, core) => {
      if (typeof rho_c === "undefined") {
        return;
      }

      // Compute report hash
      if (sets.has(rho_c.workReport.hash())) {
        rho_dagger.elements[core] = undefined;
      }
    });

    return toDagger(rho_dagger);
  }

  /**
   * converts Dagger<RHO> to DoubleDagger<RHO>
   * $(0.7.1 - 11.17)
   */
  toDoubleDagger(
    this: Dagger<RHOImpl>,
    deps: {
      rho: RHOImpl;
      p_tau: Validated<Posterior<TauImpl>>; // Ht
      newReports: NewWorkReportsImpl; // bold R
    },
  ): DoubleDagger<RHOImpl> {
    const newState = cloneCodecable(this);
    for (let c = <CoreIndex>0; c < CORES; c++) {
      if (typeof this.elements[c] === "undefined") {
        continue; // if no  workreport indagger then there is nothing to remove.
      }
      if (typeof deps.rho.elements[c] === "undefined") {
        continue;
      }

      // check if workreport from rho has now become available
      // we use this by creating a set of report hashes and cheching if 'p[c]r' is in it
      const newReportsSet = new IdentitySet(
        deps.newReports.elements.map((r) => r.hash()),
      );
      if (newReportsSet.has(deps.rho.elementAt(c)!.workReport.hash())) {
        newState.elements[c] = undefined;
      }

      if (
        deps.p_tau.value >=
        this.elements[c]!.reportSlot.value + WORK_TIMEOUT
      ) {
        newState.elements[c] = undefined;
      }
    }
    return toDoubleDagger(newState);
  }

  /**
   * $(0.7.1 - 11.43)
   */
  toPosterior(
    this: DoubleDagger<RHOImpl>,
    deps: {
      EG_Extrinsic: Validated<GuaranteesExtrinsicImpl>;
      p_tau: Validated<Posterior<TauImpl>>;
    },
  ): Posterior<RHOImpl> {
    const newState = cloneCodecable(this);
    for (let core = <CoreIndex>0; core < CORES; core++) {
      const ext = deps.EG_Extrinsic.elementForCore(core);
      if (typeof ext !== "undefined") {
        // extrinsic replace the current entry (if any)
        newState.elements[core] = new RHOElementImpl({
          workReport: ext.report,
          reportSlot: deps.p_tau,
        });
      }
    }
    return toPosterior(newState);
  }
}
