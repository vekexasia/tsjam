import { AccumulationInput } from "@tsjam/types";
import { PVMAccumulationOpImpl } from "./pvm-accumulation-op-impl";
import { DeferredTransferImpl } from "../deferred-transfer-impl";
import { ConditionalExcept } from "type-fest";
import { eitherOneOfCodec, JamCodec, asCodec } from "@tsjam/codec";

/**
 * `I` = U u X
 * $(0.7.1 - 12.15)
 * $(0.7.1 - C.33) | codec
 */
export class AccumulationInputInpl implements AccumulationInput {
  operand?: PVMAccumulationOpImpl;

  transfer?: DeferredTransferImpl;

  constructor(config: ConditionalExcept<AccumulationInputInpl, Function>) {
    Object.assign(this, config);
  }

  isTransfer() {
    return this.transfer !== undefined;
  }
  isOperand() {
    return this.operand !== undefined;
  }

  static decode(bytes: Uint8Array): {
    value: AccumulationInputInpl;
    readBytes: number;
  } {
    const { value, readBytes } = _codec.decode(bytes);
    return {
      value: new AccumulationInputInpl(value),
      readBytes,
    };
  }

  static encode(x: AccumulationInputInpl, buf: Uint8Array): number {
    return _codec.encode(x, buf);
  }

  static encodedSize(value: AccumulationInputInpl): number {
    return _codec.encodedSize(value);
  }
}

const _codec = eitherOneOfCodec<
  ConditionalExcept<AccumulationInputInpl, Function>
>([
  ["transfer", asCodec(DeferredTransferImpl)],
  ["operand", asCodec(PVMAccumulationOpImpl)],
]);
