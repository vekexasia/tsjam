import {
  BaseJamCodecable,
  codec,
  eSubIntCodec,
  JamCodec,
  JamCodecable,
  JSONCodec,
  NULLORCodec,
  Optional,
  sequenceCodec,
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
  Tau,
  Validated,
} from "@tsjam/types";
import { toDagger, toDoubleDagger, toPosterior } from "@tsjam/utils";
import assert from "assert";
import { ConditionalExcept } from "type-fest";
import { DisputesStateImpl } from "./DisputesStateImpl";
import { GuaranteesExtrinsicImpl } from "./extrinsics/guarantees";
import { JamStateImpl } from "./JamStateImpl";
import { AvailableWorkReports, WorkReportImpl } from "./WorkReportImpl";

@JamCodecable()
export class RHOElementImpl extends BaseJamCodecable implements RHOElement {
  /** `bold_r`
   */
  @codec(WorkReportImpl)
  workReport!: WorkReportImpl;
  /**
   * `t`
   */
  @eSubIntCodec(4)
  reportTime!: Tau;

  constructor(config: ConditionalExcept<RHOElementImpl, Function>) {
    super();
    Object.assign(this, config);
  }
}

@JamCodecable()
export class RHOImpl extends BaseJamCodecable implements RHO {
  @sequenceCodec(
    CORES,
    {
      ...(<JamCodec<RHOElementImpl | undefined>>new Optional(RHOElementImpl)),
      ...NULLORCodec(<JSONCodec<RHOElementImpl>>RHOElementImpl),
    },
    SINGLE_ELEMENT_CLASS,
  )
  elements!: SeqOfLength<RHOElementImpl | undefined, typeof CORES>;

  constructor(config: ConditionalExcept<RHOImpl, Function>) {
    super();
    Object.assign(this, config);
  }

  elementAt(core: CoreIndex): RHOElementImpl | undefined {
    assert(core >= 0 && core < CORES, "Core index out of bounds");
    return this.elements[core];
  }

  /**
   * Input should be the newly added hashes to phi_b and phi_w
   * $(0.7.0 - 10.15)
   */
  toDagger(deps: {
    p_disputes: Posterior<DisputesStateImpl>;
  }): Dagger<RHOImpl> {
    // NOTE: Andrea this is correct bad contains votes = 0 and wonky < 2/3+1
    // it does change from gp but we assume that if it was already present then
    // rho would have it cleared for the core
    // so this is basically doing the t < 2/3V check
    const sets = new Set([...deps.p_disputes.bad, ...deps.p_disputes.wonky]);

    const rho_dagger = structuredClone(this);
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
   * $(0.7.0 - 11.17)
   */
  static toDoubleDagger(
    d_rho: Dagger<RHOImpl>,
    deps: {
      rho: RHOImpl;
      p_tau: Posterior<Tau>; // Ht
      availableReports: AvailableWorkReports; // bold R
    },
  ): DoubleDagger<RHOImpl> {
    const newState = structuredClone(d_rho);
    for (let c = <CoreIndex>0; c < CORES; c++) {
      if (typeof d_rho.elements[c] === "undefined") {
        continue; // if no  workreport indagger then there is nothing to remove.
      }
      const [w] = deps.availableReports.filter((w) => w.core === c);
      // check if workreport from rho has now become available

      if (
        deps.rho.elements[c] &&
        w &&
        deps.rho.elements[c]!.workReport.authorizerHash === w.authorizerHash
      ) {
        newState.elements[c] = undefined;
      }

      if (deps.p_tau >= d_rho.elements[c]!.reportTime + WORK_TIMEOUT) {
        newState.elements[c] = undefined;
      }
    }
    return toDoubleDagger(newState);
  }

  /**
   * $(0.7.0 - 11.43)
   */
  static toPosterior(
    dd_rho: DoubleDagger<RHOImpl>,
    deps: {
      EG_Extrinsic: Validated<GuaranteesExtrinsicImpl>;
      kappa: JamStateImpl["kappa"];
      p_tau: Posterior<Tau>;
    },
  ): Posterior<RHOImpl> {
    const newState = structuredClone(dd_rho);
    for (let core = <CoreIndex>0; core < CORES; core++) {
      const ext = deps.EG_Extrinsic.elementForCore(core);
      if (typeof ext !== "undefined") {
        // extrinsic replace the current entry (if any)
        newState.elements[core] = new RHOElementImpl({
          workReport: ext.report,
          reportTime: deps.p_tau,
        });
      }
    }
    return toPosterior(newState);
  }
}
