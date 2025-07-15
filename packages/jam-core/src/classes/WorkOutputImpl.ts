import {
  BaseJamCodecable,
  BufferJSONCodec,
  E,
  encodeWithCodec,
  LengthDiscrimantedIdentity,
} from "@tsjam/codec";
import { WorkError, WorkOutput } from "@tsjam/types";
import { WorkItemImpl } from "./WorkItemImpl";

// codec order defined in $(0.7.0 - C.34)
export class WorkOutputImpl extends BaseJamCodecable implements WorkOutput {
  success?: Uint8Array;
  error?: WorkError;
  isError() {
    return !(this.success instanceof Uint8Array);
  }
  isSuccess() {
    return this.success instanceof Uint8Array;
  }

  static encode<T>(_value: T, bytes: Uint8Array): number {
    let offset = 0;
    const value = _value as WorkOutputImpl;

    if (value.isSuccess()) {
      offset = E.encode(0n, bytes);
      offset += LengthDiscrimantedIdentity.encode(
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
  static encodedSize<T>(_value: T): number {
    const value = <WorkOutputImpl>_value;
    if (value.isSuccess()) {
      return (
        E.encodedSize(0n) +
        LengthDiscrimantedIdentity.encodedSize(value.success!)
      );
    }
    return E.encodedSize(1n);
  }

  static decode<T>(bytes: Uint8Array) {
    const toRet = new WorkOutputImpl();
    if (bytes[0] === 0) {
      const r = LengthDiscrimantedIdentity.decode(bytes.subarray(1));
      toRet.success = r.value;
      return {
        value: toRet as unknown as T,
        readBytes: r.readBytes + 1,
      };
    }
    // construct with placeholder
    switch (bytes[0]) {
      case 1:
        toRet.error = WorkError.OutOfGas;
        break;
      case 2:
        toRet.error = WorkError.Panic;
        break;
      case 3:
        toRet.error = WorkError.BadExports;
        break;
      case 4:
        toRet.error = WorkError.Oversize;
        break;
      case 5:
        toRet.error = WorkError.Bad;
        break;
      case 6:
        toRet.error = WorkError.Big;
        break;
      default:
        throw new Error(`Invalid value ${bytes[0]}`);
    }
    return { value: toRet as unknown as T, readBytes: 1 };
  }

  toBinary(): Uint8Array {
    return encodeWithCodec(WorkOutputImpl, this);
  }
  toJSON(): object {
    if (this.isSuccess()) {
      return { ok: BufferJSONCodec().toJSON(<any>this.success!) };
    }
    switch (this.error!) {
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

  static fromJSON<T>(json: any): T {
    const toRet = new WorkOutputImpl();
    if ("ok" in json) {
      toRet.success = BufferJSONCodec().fromJSON(json.ok);
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

if (import.meta.vitest) {
  const { beforeAll, describe, it, expect } = import.meta.vitest;
  const { getCodecFixtureFile } = await import("@/test/codec_utils.js");
  describe("WorkItemCodec", () => {
    let bin: Uint8Array;
    let json: object;
    beforeAll(() => {
      bin = getCodecFixtureFile("work_item.bin");
      json = JSON.parse(
        Buffer.from(getCodecFixtureFile("work_item.json")).toString("utf8"),
      );
    });

    it.fails("should encode/decode properly", () => {
      const decoded = WorkItemImpl.decode<WorkItemImpl>(bin);
      const reencoded = decoded.value.toBinary();
      expect(Buffer.from(reencoded).toString("hex")).toBe(
        Buffer.from(bin).toString("hex"),
      );
    });
    it("should encode/decode from JSON", () => {
      const decoded = WorkItemImpl.fromJSON<WorkItemImpl>(json);
      const reencoded = decoded.toJSON();
      expect(reencoded).toEqual(json);
    });
  });
}
