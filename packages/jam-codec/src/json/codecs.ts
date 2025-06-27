import {
  Blake2bHash,
  GammaSFallback,
  GammaSNormal,
  IDisputesState,
  JamEntropy,
  JamState,
  SafroleState,
} from "@tsjam/types";
import {
  ArrayOfJSONCodec,
  BufferJSONCodec,
  createJSONCodec,
  Ed25519BigIntJSONCodec,
  EitherOneOfJSONCodec,
  HashJSONCodec,
  JC_J,
  JSONCodec,
  SetJSONCodec,
  ZipJSONCodecs,
} from "./JsonCodec";
import { isFallbackMode } from "@tsjam/utils";
import { ValidatorDataArrayJSONCodec } from "@/validatorDataCodec";
import { TicketJSONCodec } from "@/setelements/TicketCodec.js";

export const GammaSJSONCodec: JSONCodec<
  SafroleState["gamma_s"],
  { keys: string[] } | { tickets: Array<{ id: string; attempt: number }> }
> = EitherOneOfJSONCodec<GammaSFallback, GammaSNormal>(
  ArrayOfJSONCodec(BufferJSONCodec()),
  ArrayOfJSONCodec(TicketJSONCodec),
  "keys",
  "tickets",
  (v) => isFallbackMode(v),
);

export const GammaAJsonCodec: JSONCodec<
  SafroleState["gamma_a"],
  Array<JC_J<typeof TicketJSONCodec>>
> = ArrayOfJSONCodec(TicketJSONCodec);

//TODO: psi/DisputesState

export const EntropyJSONCodec = ArrayOfJSONCodec<
  JamEntropy,
  Blake2bHash,
  string
>(HashJSONCodec());

export const IOTAJSONCodec = ValidatorDataArrayJSONCodec<JamState["iota"]>();
export const GammaPJSONCodec =
  ValidatorDataArrayJSONCodec<SafroleState["gamma_p"]>();
export const KappaJSONCodec = ValidatorDataArrayJSONCodec<JamState["kappa"]>();
export const LambdaJSONCodec =
  ValidatorDataArrayJSONCodec<JamState["lambda"]>();

export const DisputesJSONCodec: JSONCodec<
  IDisputesState,
  { good: string[]; bad: string[]; wonky: string[]; offenders: string[] }
> = createJSONCodec([
  [
    "good",
    "good",
    ZipJSONCodecs(
      ArrayOfJSONCodec(HashJSONCodec()),
      SetJSONCodec((a, b) => Number(a - b)),
    ),
  ],
  [
    "bad",
    "bad",
    ZipJSONCodecs(
      ArrayOfJSONCodec(HashJSONCodec()),
      SetJSONCodec((a, b) => Number(a - b)),
    ),
  ],
  [
    "wonky",
    "wonky",
    ZipJSONCodecs(
      ArrayOfJSONCodec(HashJSONCodec()),
      SetJSONCodec((a, b) => Number(a - b)),
    ),
  ],
  [
    "offenders",
    "offenders",
    ZipJSONCodecs(
      ArrayOfJSONCodec(Ed25519BigIntJSONCodec),
      SetJSONCodec((a, b) => Number(a - b)),
    ),
  ],
]);
