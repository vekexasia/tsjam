import { JamCodec, JSONCodec } from "@tsjam/codec";
import * as fs from "node:fs";

export const getCodecFixtureFile = (
  filename: string,
  size: string = "full",
): Uint8Array => {
  return new Uint8Array(
    fs.readFileSync(
      new URL(
        `../../../jamtestvectors/codec/${size}/${filename}`,
        import.meta.url,
      ).pathname,
    ),
  );
};

export const TestOutputCodec = <Error extends number, Output>(
  outputCodec: JamCodec<Output>,
): JamCodec<{ err?: Error; ok?: Output }> &
  JSONCodec<{ err?: Error; ok?: Output }> => {
  const toRet: JamCodec<{ err?: Error; ok?: Output }> = {
    encode() {
      throw new Error("Not implemented");
    },
    decode(bytes) {
      if (bytes[0] === 0) {
        const output = outputCodec.decode(bytes.subarray(1));
        return {
          value: { ok: output.value },
          readBytes: 1 + output.readBytes,
        };
      } else {
        //
        return {
          value: { err: bytes[1] as Error },
          readBytes: 2,
        };
      }
    },
    encodedSize(value) {
      return (
        1 +
        (typeof value.err !== "undefined"
          ? 1
          : outputCodec.encodedSize(value.ok!))
      );
    },
  };
  return {
    ...toRet,
    fromJSON(json) {
      return json;
    },
    toJSON(value) {
      return value;
    },
  };
};

export const logCodec = <B extends JamCodec<C>, C>(
  name: string,
  codec: B,
  logger: (value: C) => string = (value) => `${value}`,
): B => {
  const saneBufferLog = (bytes: Uint8Array, length: number) => {
    if (length > 64) {
      return `${Buffer.from(bytes.subarray(0, 16)).toString("hex")}...${Buffer.from(bytes.subarray(length - 16, length)).toString("hex")}`;
    }
    return Buffer.from(bytes.subarray(0, length)).toString("hex");
  };
  const saneValLog: (value: C) => string = (value: C): string => {
    return `${logger(value)}`;
  };
  return <B>{
    ...codec,
    encode(value, bytes) {
      const toRet = codec.encode(value, bytes);
      console.log(
        `LogCodec[${name}][E] = length=${toRet} - value=${saneValLog(value)} - encoded=${saneBufferLog(bytes, toRet)}`,
      );
      return toRet;
    },
    decode(bytes) {
      const toRet = codec.decode(bytes);
      console.log(
        `LogCodec[${name}][D] = read=${toRet.readBytes} - buf=${saneBufferLog(bytes, toRet.readBytes)} - value=${`${saneValLog(toRet.value)}`}`,
      );
      return toRet;
    },
    encodedSize(value) {
      const toRet = codec.encodedSize(value);
      console.log(`LogCodec[${name}][ES] = ${value} - ${toRet}`);
      return toRet;
    },
  };
};
