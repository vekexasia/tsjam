import { u32 } from "@tsjam/types";
import { PVM } from "./pvm-base";

export class GasState {
  private n!: number;
  /**
   * `\imath`
   */
  pc!: u32;

  /**
   * `c<sup>.</sup>`
   */
  ctr_cycles!: u32;

  /**
   * `n<sup>.</sup>`
   */
  ctr_instructions!: u32;

  /**
   * `d<sup>.</sup> = 4`
   */
  remaining_decodeslots!: u32;

  /**
   * `e<sup>.</sup> = 5`
   */
  remaining_startpercycle!: u32;

  /**
   * `s->`
   */
  reorderbuffer_state!: Map<never, never>;

  /**
   * `c->`
   */
  reorderbuffer_cyclesleft!: Map<never, never>;

  /**
   * `p->`
   */
  reorderbuffer_deps!: Map<never, never>;

  /**
   * `r->`
   */
  reorderbuffer_regs!: Map<never, never>;

  /**
   * `x->`
   */
  reorderbuffer_execution_units!: Map<never, never>;

  /**
   * `x<sup>.</sup>`
   */
  remaining_execution_units!: {
    ALU: 4;
    LOAD: 4;
    STORE: 4;
    MUL: 1;
    DIV: 1;
  };

  /**
   * $(0.8.0 - A.52)
   *
   */
  next(pvm: PVM): GasState {
    const toRet = new GasState();
    toRet.n = this.n + 1;

    return toRet;
  }

  xi_(pvm: PVM) {
    // move reg
    if (100 === pvm.ix_at(this.pc)) {
      return this.xi_mov();
    }
    return this.xi_decode();
  }

  xi_mov(pvm: PVM) {
    toRet.pc = this.pc + 1 + pvm.skip_at(this.pc);
  }
  xi_decode() {}

  /**
   * $(0.8.0 - A.51)
   *
   */
  static initial(pc: u32): GasState {
    const toRet = new GasState();
    toRet.n = 0;
    toRet.pc = pc;
    toRet.ctr_cycles = <u32>0;
    toRet.ctr_instructions = <u32>0;
    toRet.remaining_decodeslots = <u32>4;
    toRet.remaining_startpercycle = <u32>5;
    toRet.reorderbuffer_state = new Map<never, never>();
    toRet.reorderbuffer_cyclesleft = new Map<never, never>();
    toRet.reorderbuffer_deps = new Map<never, never>();
    toRet.reorderbuffer_regs = new Map<never, never>();
    toRet.reorderbuffer_execution_units = new Map<never, never>();
    toRet.remaining_execution_units = {
      ALU: 4,
      LOAD: 4,
      STORE: 4,
      MUL: 1,
      DIV: 1,
    };
    return toRet;
  }
}

/**
 *
 * $(0.8.0 - A.58)
 */
export function readyToStart(): void {}
