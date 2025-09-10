import { EPOCH_LENGTH } from "@tsjam/constants";
import { SeqOfLength } from "@tsjam/types";
import { TicketImpl } from "./impls/ticket-impl";
import fs from "fs";
import { xBytesCodec } from "@tsjam/codec";

/**
 * Z fn
 * exported cause it's being used to check/produce `Hw` in Header
 * $(0.7.1 - 6.25)
 */
export const outsideInSequencer = <
  T extends SeqOfLength<TicketImpl, typeof EPOCH_LENGTH>,
>(
  t: SeqOfLength<TicketImpl, typeof EPOCH_LENGTH>,
): T => {
  const toRet: T = [] as unknown as T;
  for (let i = 0; i < EPOCH_LENGTH / 2; i++) {
    toRet.push(t[i]);
    toRet.push(t[EPOCH_LENGTH - i - 1]);
  }
  return toRet;
};

const goFS = typeof process.env.TRACE_FILE === "string";
if (goFS && fs.existsSync(process.env.TRACE_FILE!)) {
  fs.unlinkSync(process.env.TRACE_FILE!);
}
export const resetTraceLog = () => {
  if (goFS && fs.existsSync(process.env.TRACE_FILE!)) {
    fs.unlinkSync(process.env.TRACE_FILE!);
  }
};
export const log = (_str: string | object, debug: boolean) => {
  if (!debug) {
    return;
  }
  let str: string;
  if (typeof _str === "string") {
    str = _str;
  } else {
    if ("toJSON" in _str && typeof _str.toJSON == "function") {
      str = _str.toJSON();
    } else {
      str = JSON.stringify(_str, (_key, value) => {
        if (typeof value === "undefined") {
          return value;
        }
        if (typeof value === "bigint") {
          return value.toString();
        }
        if (value instanceof Uint8Array) {
          // eslint-disable-next-line
        return xBytesCodec(value.length).toJSON(<any>value);
        }
        if (Buffer.isBuffer(value)) {
          // eslint-disable-next-line
        return xBytesCodec(value.length).toJSON(<any>value);
        }

        if (typeof value.toJSON == "function") {
          return value.toJSON();
        }
        return value;
      });
    }
  }
  if (goFS) {
    fs.appendFileSync(process.env.TRACE_FILE!, str + "\n");
  }
  // console.log(str);
};
