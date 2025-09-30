import {
  BaseJamCodecable,
  JamCodecable,
  sequenceCodec,
  SINGLE_ELEMENT_CLASS,
} from "@tsjam/codec";
import type {
  PVMRegisterRawValue,
  PVMRegisters,
  SeqOfLength,
} from "@tsjam/types";
import { PVMRegisterImpl } from "./pvm-register";
import { toTagged } from "@tsjam/utils";

@JamCodecable()
export class PVMRegistersImpl extends BaseJamCodecable implements PVMRegisters {
  @sequenceCodec(13, PVMRegisterImpl, SINGLE_ELEMENT_CLASS)
  elements!: SeqOfLength<PVMRegisterImpl, 13>;

  constructor(elements?: SeqOfLength<PVMRegisterImpl, 13>) {
    super();
    if (typeof elements !== "undefined") {
      this.elements = elements;
    } else {
      this.elements = toTagged(
        new Array(13)
          .fill(null)
          .map(() => new PVMRegisterImpl(<PVMRegisterRawValue>0n)),
      );
    }
  }

  slice(start: number, end?: number): PVMRegisterImpl[] {
    return this.elements.slice(start, end);
  }
  w0() {
    return this.elements[0];
  }
  w1() {
    return this.elements[1];
  }
  w2() {
    return this.elements[2];
  }
  w3() {
    return this.elements[3];
  }
  w4() {
    return this.elements[4];
  }
  w5() {
    return this.elements[5];
  }
  w6() {
    return this.elements[6];
  }
  w7() {
    return this.elements[7];
  }
  w8() {
    return this.elements[8];
  }
  w9() {
    return this.elements[9];
  }
  w10() {
    return this.elements[10];
  }
  w11() {
    return this.elements[11];
  }
  w12() {
    return this.elements[12];
  }
}
