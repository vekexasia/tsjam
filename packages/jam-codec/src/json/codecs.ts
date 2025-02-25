import {
  Blake2bHash,
  GammaSFallback,
  GammaSNormal,
  HeaderHash,
  JamEntropy,
  JamState,
  RecentHistory,
  RecentHistoryItem,
  RHO,
  SafroleState,
  StateRootHash,
  Tau,
  TicketIdentifier,
  WorkPackageHash,
} from "@tsjam/types";
import {
  ArrayOfJSONCodec,
  BigIntJSONCodec,
  BufferJSONCodec,
  createJSONCodec,
  EitherOneOfJSONCodec,
  HashJSONCodec,
  JSONCodec,
  MapJSONCodec,
  NULLORCodec,
  NumberJSONCodec,
  WrapJSONCodec,
} from "./JsonCodec";
import { TicketIdentifierJSONCodec } from "@/ticketIdentifierCodec";
import { isFallbackMode } from "@tsjam/utils";
import { ValidatorDataArrayJSONCodec } from "@/validatorDataCodec";
import { WorkReportJSONCodec } from "@/setelements/WorkReportCodec";

export const RecentHistoryJSONCodec: JSONCodec<RecentHistory> =
  ArrayOfJSONCodec(
    createJSONCodec<RecentHistoryItem>([
      ["headerHash", "header_hash", HashJSONCodec<HeaderHash>()],
      [
        "accumulationResultMMR",
        "mmr",
        WrapJSONCodec("peaks", ArrayOfJSONCodec(NULLORCodec(HashJSONCodec()))),
      ],
      ["stateRoot", "state_root", HashJSONCodec<StateRootHash>()],
      [
        "reportedPackages",
        "reported",
        MapJSONCodec(
          { key: "work_package_hash", value: "segment_tree_root" },
          HashJSONCodec<WorkPackageHash>(),
          HashJSONCodec(),
        ),
      ],
    ]),
  );

export const GammaSJSONCodec: JSONCodec<
  SafroleState["gamma_s"],
  { keys: string[] } | { tickets: Array<{ id: string; attempt: number }> }
> = EitherOneOfJSONCodec<GammaSFallback, GammaSNormal>(
  ArrayOfJSONCodec(BufferJSONCodec()),
  ArrayOfJSONCodec(TicketIdentifierJSONCodec),
  "keys",
  "tickets",
  (v) => isFallbackMode(v),
);

export const GammaAJsonCodec = WrapJSONCodec(
  "tickets",
  ArrayOfJSONCodec<SafroleState["gamma_a"], TicketIdentifier>(
    TicketIdentifierJSONCodec,
  ),
);

//TODO: psi/DisputesState

export const EntropyJSONCodec = ArrayOfJSONCodec<JamEntropy, Blake2bHash>(
  BigIntJSONCodec(),
);

export const IOTAJSONCodec = ValidatorDataArrayJSONCodec<JamState["iota"]>();
export const KappaJSONCodec = ValidatorDataArrayJSONCodec<JamState["kappa"]>();
export const LambdaJSONCodec =
  ValidatorDataArrayJSONCodec<JamState["lambda"]>();

export const RHOJSONCodec: JSONCodec<
  RHO,
  Array<null | { report: any; timeout: number }>
> = ArrayOfJSONCodec<RHO, RHO[0]>(
  NULLORCodec(
    createJSONCodec([
      ["workReport", "report", WorkReportJSONCodec],
      ["reportTime", "timeout", NumberJSONCodec<Tau>()],
    ]),
  ),
);
