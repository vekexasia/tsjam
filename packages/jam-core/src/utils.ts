import { EPOCH_LENGTH } from "@tsjam/constants";
import { SeqOfLength } from "@tsjam/types";
import { TicketImpl } from "./impls/ticket-impl";
import fs from "fs";

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

const goFS = process.env.DEBUG_STEPS == "true";
if (goFS && fs.existsSync("/tmp/trace.txt")) {
  fs.unlinkSync("/tmp/trace.txt");
}
export const log = (str: string) => {
  if (goFS) {
    fs.appendFileSync(`/tmp/trace.txt`, str + "\n");
  }
  console.log(str);
};
