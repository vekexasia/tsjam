import {
  BaseJamCodecable,
  eSubBigIntCodec,
  JamCodecable,
  SINGLE_ELEMENT_CLASS,
} from "@tsjam/codec";
import type {
  PVMRegisterRawValue,
  PVMRegisterValue,
  Tagged,
  u32,
  u64,
} from "@tsjam/types";
import { toTagged } from "@tsjam/utils";

@JamCodecable()
export class PVMRegisterImpl
  extends BaseJamCodecable
  implements PVMRegisterValue
{
  @eSubBigIntCodec(8, SINGLE_ELEMENT_CLASS)
  value!: PVMRegisterRawValue;

  constructor(value?: PVMRegisterRawValue) {
    super();
    this.value = value ?? toTagged(0n);
  }

  u32<T extends u32>(this: Tagged<PVMRegisterImpl, "<u32">): T {
    return Number(this.value) as T;
  }

  fitsInU32(): this is Tagged<PVMRegisterImpl, "<u32"> {
    return this.value < 2n ** 32n;
  }

  u64<T extends u64>(): T {
    return this.value as u64 as T;
  }

  [Symbol.toPrimitive](hint: string): string | number {
    if (hint === "number") {
      return Number(this.value);
    }
    return `${this.value}`;
  }
}
