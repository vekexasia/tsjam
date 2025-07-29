import {
  BaseJamCodecable,
  eSubBigIntCodec,
  JamCodecable,
  SINGLE_ELEMENT_CLASS,
} from "@tsjam/codec";
import { PVMRegisterValue, PVMRegisterRawValue, u32, u64 } from "@tsjam/types";
import { toTagged } from "@tsjam/utils";
import assert from "node:assert";

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

  checked_u32<T extends u32>(): T {
    assert(this.fitsInU32(), "Value exceeds u32 range");
    return Number(this.value) as T;
  }

  fitsInU32(): boolean {
    return this.value < 2n ** 32n;
  }

  u64<T extends u64>(): T {
    return this.value as u64 as T;
  }

  toSafeMemoryAddress(): u32 {
    return <u32>Number(this.value % 2n ** 32n);
  }

  [Symbol.toPrimitive](hint: string): string | number {
    if (hint === "number") {
      return Number(this.value);
    }
    return `${this.value}`;
  }
}
