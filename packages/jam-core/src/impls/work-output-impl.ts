import {
  BaseJamCodecable,
  BufferJSONCodec,
  E,
  encodeWithCodec,
  LengthDiscrimantedIdentityCodec,
} from "@tsjam/codec";
import { WorkError, WorkOutput } from "@tsjam/types";
import { toTagged } from "@tsjam/utils";

export interface WorkOutputError<E extends WorkError>
  extends WorkOutputImpl<E> {
  error: E;
}
export interface WorkOutputSuccess extends WorkOutputImpl {
  success: Buffer;
}
/**
 * `E u B`
 * $(0.7.1 - C.34) | codec
 */
export class WorkOutputImpl<T extends WorkError = WorkError>
  extends BaseJamCodecable
  implements WorkOutput
{
  success?: Uint8Array;
  error?: T;

  constructor(d?: Uint8Array | T) {
    super();
    if (typeof d !== "undefined") {
      if (d instanceof Uint8Array) {
        this.success = d;
      } else {
        this.error = d;
      }
    }
  }
  isError(): this is WorkOutputError<WorkError> {
    return !(this.success instanceof Uint8Array);
  }
  isSuccess(): this is WorkOutputSuccess {
    return this.success instanceof Uint8Array;
  }
  isPanic(): this is WorkOutputError<WorkError.Panic> {
    return this.error === WorkError.Panic;
  }
  isOutOfGas(): this is WorkOutputError<WorkError.OutOfGas> {
    return this.error === WorkError.OutOfGas;
  }

  static big() {
    return new WorkOutputImpl(WorkError.Big);
  }
  static badExports() {
    return new WorkOutputImpl(WorkError.BadExports);
  }
  static bad() {
    return new WorkOutputImpl(WorkError.Bad);
  }
  static outOfGas(): WorkOutputError<WorkError.OutOfGas> {
    return <WorkOutputError<WorkError.OutOfGas>>(
      new WorkOutputImpl(WorkError.OutOfGas)
    );
  }
  static panic(): WorkOutputError<WorkError.Panic> {
    return <WorkOutputError<WorkError.Panic>>(
      new WorkOutputImpl(WorkError.Panic)
    );
  }
  static oversize(): WorkOutputError<WorkError.Oversize> {
    return <WorkOutputError<WorkError.Oversize>>(
      new WorkOutputImpl(WorkError.Oversize)
    );
  }

  static encode<T extends typeof BaseJamCodecable>(
    this: T,
    _value: InstanceType<T>,
    bytes: Uint8Array,
  ): number {
    let offset = 0;

    const value = _value as WorkOutputImpl;

    if (value.isSuccess()) {
      offset = E.encode(0n, bytes);
      offset += LengthDiscrimantedIdentityCodec.encode(
        value.success!,
        bytes.subarray(offset),
      );
    } else {
      switch (value.error!) {
        case WorkError.OutOfGas:
          offset = E.encode(1n, bytes);
          break;
        case WorkError.Panic:
          offset = E.encode(2n, bytes);
          break;
        case WorkError.BadExports:
          offset = E.encode(3n, bytes);
          break;
        case WorkError.Oversize:
          offset = E.encode(4n, bytes);
          break;
        case WorkError.Bad:
          offset = E.encode(5n, bytes);
          break;
        case WorkError.Big:
          offset = E.encode(6n, bytes);
          break;
      }
    }
    return offset;
  }

  static encodedSize<T extends typeof BaseJamCodecable>(
    this: T,
    _value: InstanceType<T>,
  ): number {
    const value = <WorkOutputImpl>_value;
    if (value.isSuccess()) {
      return (
        E.encodedSize(0n) +
        LengthDiscrimantedIdentityCodec.encodedSize(value.success!)
      );
    }
    return E.encodedSize(1n);
  }

  static decode<T extends typeof BaseJamCodecable>(
    this: T,
    bytes: Uint8Array,
  ): {
    value: InstanceType<T>;
    readBytes: number;
  } {
    if (bytes[0] === 0) {
      const r = LengthDiscrimantedIdentityCodec.decode(bytes.subarray(1));
      return {
        value: new WorkOutputImpl(r.value) as InstanceType<T>,
        readBytes: r.readBytes + 1,
      };
    }

    // construct with placeholder
    switch (bytes[0]) {
      case 1:
        return {
          value: WorkOutputImpl.outOfGas() as InstanceType<T>,
          readBytes: 1,
        };
      case 2:
        return {
          value: WorkOutputImpl.panic() as InstanceType<T>,
          readBytes: 1,
        };
      case 3:
        return {
          value: WorkOutputImpl.badExports() as InstanceType<T>,
          readBytes: 1,
        };
      case 4:
        return {
          value: WorkOutputImpl.oversize() as InstanceType<T>,
          readBytes: 1,
        };
      case 5:
        return { value: WorkOutputImpl.bad() as InstanceType<T>, readBytes: 1 };
      case 6:
        return { value: WorkOutputImpl.big() as InstanceType<T>, readBytes: 1 };
      default:
        throw new Error(`Invalid value ${bytes[0]}`);
    }
  }

  toBinary(): Buffer {
    return encodeWithCodec(WorkOutputImpl, this);
  }

  toJSON(): object {
    if (this.isSuccess()) {
      return { ok: BufferJSONCodec().toJSON(toTagged(this.success!)) };
    }
    switch (<WorkError>this.error!) {
      case WorkError.OutOfGas:
        return { "out-of-gas": null };
      case WorkError.Panic:
        return { panic: null };
      case WorkError.BadExports:
        return { "bad-exports": null };
      case WorkError.Oversize:
        return { oversize: null };
      case WorkError.Bad:
        return { "bad-code": null };
      case WorkError.Big:
        return { "code-oversize": null };
    }
  }

  static fromJSON<T>(json: object): T {
    const toRet = new WorkOutputImpl();
    if ("ok" in json) {
      toRet.success = BufferJSONCodec().fromJSON(<string>json.ok);
    } else if ("out-of-gas" in json) {
      toRet.error = WorkError.OutOfGas;
    } else if ("panic" in json) {
      toRet.error = WorkError.Panic;
    } else if ("bad-exports" in json) {
      toRet.error = WorkError.BadExports;
    } else if ("bad-code" in json) {
      toRet.error = WorkError.Bad;
    } else if ("code-oversize" in json) {
      toRet.error = WorkError.Big;
    } else {
      throw new Error("wrong json encoding of work output");
    }
    return toRet as unknown as T;
  }

  static toJSON<T>(value: T): object {
    if (value instanceof WorkOutputImpl) {
      return value.toJSON();
    }
    throw new Error(`Cannot convert ${value} to JSON`);
  }
}
