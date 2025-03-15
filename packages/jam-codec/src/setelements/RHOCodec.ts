import { E_sub_int } from "@/ints/E_subscr.js";
import { createCodec } from "@/utils.js";
import { createSequenceCodec } from "@/sequenceCodec.js";
import { Optional } from "@/optional.js";
import { WorkReportCodec, WorkReportJSONCodec } from "./WorkReportCodec.js";
import { CORES } from "@tsjam/constants";
import { RHO, Tau } from "@tsjam/types";
import {
  ArrayOfJSONCodec,
  createJSONCodec,
  NULLORCodec,
  NumberJSONCodec,
} from "@/json/JsonCodec.js";

export const RHOCodec = () =>
  createSequenceCodec(
    CORES,
    new Optional(
      createCodec<NonNullable<RHO[0]>>([
        ["workReport", WorkReportCodec],
        ["reportTime", E_sub_int<Tau>(4)],
      ]),
    ),
  );

export const RHOJSONCodec = ArrayOfJSONCodec<
  RHO,
  RHO[0],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  null | { report: any; timeout: number }
>(
  NULLORCodec(
    createJSONCodec([
      ["workReport", "report", WorkReportJSONCodec],
      ["reportTime", "timeout", NumberJSONCodec<Tau>()],
    ]),
  ),
);
