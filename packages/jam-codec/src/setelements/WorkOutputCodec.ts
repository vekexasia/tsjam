import { WorkError, WorkOutput } from "@tsjam/types";
import { JamCodec } from "@/codec.js";
import { E } from "@/ints/e.js";
import { LengthDiscrimantedIdentity } from "@/lengthdiscriminated/lengthDiscriminator.js";
import { BufferJSONCodec, JSONCodec } from "@/json/JsonCodec";

// $(0.6.1  - C.29)
export const WorkOutputCodec: JamCodec<WorkOutput> = {
  encode(value: WorkOutput, bytes: Uint8Array): number {
    let offset = 0;
    if (value instanceof Uint8Array) {
      offset = E.encode(0n, bytes);
      offset += LengthDiscrimantedIdentity.encode(
        value,
        bytes.subarray(offset),
      );
    } else {
      switch (value) {
        case WorkError.OutOfGas:
          offset = E.encode(1n, bytes);
          break;
        case WorkError.UnexpectedTermination:
          offset = E.encode(2n, bytes);
          break;
        case WorkError.BadExports:
          offset = E.encode(3n, bytes);
          break;
        case WorkError.Bad:
          offset = E.encode(4n, bytes);
          break;
        case WorkError.Big:
          offset = E.encode(5n, bytes);
          break;
      }
    }
    return offset;
  },
  decode(bytes: Uint8Array): { value: WorkOutput; readBytes: number } {
    if (bytes[0] === 0) {
      const r = LengthDiscrimantedIdentity.decode(bytes.subarray(1));
      return { value: r.value, readBytes: r.readBytes + 1 };
    }
    switch (bytes[0]) {
      case 1:
        return { value: WorkError.OutOfGas, readBytes: 1 };
      case 2:
        return {
          value: WorkError.UnexpectedTermination,
          readBytes: 1,
        };
      case 3:
        return {
          value: WorkError.BadExports,
          readBytes: 1,
        };
      case 4:
        return { value: WorkError.Bad, readBytes: 1 };
      case 5:
        return { value: WorkError.Big, readBytes: 1 };
    }
    throw new Error("Invalid value");
  },
  encodedSize(value: WorkOutput): number {
    if (value instanceof Uint8Array) {
      return E.encodedSize(0n) + LengthDiscrimantedIdentity.encodedSize(value);
    }
    return E.encodedSize(1n);
  },
};

export const WorkOutputJSONCodec: JSONCodec<
  WorkOutput,
  | { ok: string }
  | { "out-of-gas": null }
  | { panic: null }
  | { "bad-exports": null }
  | { "bad-code": null }
  | { "code-oversize": null }
> = {
  fromJSON(json) {
    if ("ok" in json) {
      return BufferJSONCodec().fromJSON(json.ok);
    } else if ("out-of-gas" in json) {
      return WorkError.OutOfGas;
    } else if ("panic" in json) {
      return WorkError.UnexpectedTermination;
    } else if ("bad-exports" in json) {
      return WorkError.BadExports;
    } else if ("bad-code" in json) {
      return WorkError.Bad;
    } else if ("code-oversize" in json) {
      return WorkError.Big;
    }
    throw new Error("wrong encoding in json of workoutput");
  },
  toJSON(value) {
    if (value instanceof Uint8Array) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { ok: BufferJSONCodec().toJSON(<any>value) };
    }
    switch (value) {
      case WorkError.OutOfGas:
        return { "out-of-gas": null };
      case WorkError.UnexpectedTermination:
        return { panic: null };
      case WorkError.BadExports:
        return { "bad-exports": null };
      case WorkError.Bad:
        return { "bad-code": null };
      case WorkError.Big:
        return { "code-oversize": null };
    }
  },
};
