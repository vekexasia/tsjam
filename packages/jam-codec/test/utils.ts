import { JamCodec } from "../src/codec.js";
import * as fs from "node:fs";

export const getCodecFixtureFile = (filename: string): Uint8Array => {
  return new Uint8Array(
    fs.readFileSync(
      new URL(`../../../jamtestvectors/codec/data/${filename}`, import.meta.url)
        .pathname,
    ),
  );
};

export const TestOutputCodec = <Error extends number, Output>(
  outputCodec: JamCodec<Output>,
): JamCodec<{ error?: Error; output?: Output }> => {
  const toRet: JamCodec<{ error?: Error; output?: Output }> = {
    encode() {
      throw new Error("Not implemented");
    },
    decode(bytes) {
      if (bytes[0] === 0) {
        const output = outputCodec.decode(bytes.subarray(1));
        return {
          value: { output: output.value },
          readBytes: 1 + output.readBytes,
        };
      } else {
        //
        return {
          value: { error: bytes[1] as Error },
          readBytes: 2,
        };
      }
    },
    encodedSize(value) {
      return (
        1 +
        (typeof value.error !== "undefined"
          ? 1
          : outputCodec.encodedSize(value.output!))
      );
    },
  };
  return toRet;
};

export const logCodec = <A, B>(
  input: [name: A, codec: JamCodec<B>],
  logger: (value: B) => string = (value) => `${value}`,
): [A, JamCodec<B>] => {
  const [name, codec] = input;
  const saneBufferLog = (bytes: Uint8Array, length: number) => {
    if (length > 64) {
      return `${Buffer.from(bytes.subarray(0, 16)).toString("hex")}...${Buffer.from(bytes.subarray(length - 16, length)).toString("hex")}`;
    }
    return Buffer.from(bytes.subarray(0, length)).toString("hex");
  };
  const saneValLog: (value: B) => string = (value: B): string => {
    return `${logger(value)}`;
  };
  return [
    name,
    {
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
    },
  ];
};
