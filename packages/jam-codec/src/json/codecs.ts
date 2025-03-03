import {
  AccumulationQueue,
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
  WorkPackageHash,
} from "@tsjam/types";
import {
  ArrayOfJSONCodec,
  BufferJSONCodec,
  createJSONCodec,
  EitherOneOfJSONCodec,
  HashJSONCodec,
  JSONCodec,
  MapJSONCodec,
  NULLORCodec,
  NumberJSONCodec,
  SetJSONCodec,
  WrapJSONCodec,
  ZipJSONCodecs,
} from "./JsonCodec";
import { TicketIdentifierJSONCodec } from "@/ticketIdentifierCodec";
import { isFallbackMode } from "@tsjam/utils";
import { ValidatorDataArrayJSONCodec } from "@/validatorDataCodec";
import {
  WorkReportJSON,
  WorkReportJSONCodec,
} from "@/setelements/WorkReportCodec";

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

export const GammaAJsonCodec = WrapJSONCodec<
  SafroleState["gamma_a"],
  "tickets"
>("tickets", ArrayOfJSONCodec(TicketIdentifierJSONCodec));

//TODO: psi/DisputesState

export const EntropyJSONCodec = ArrayOfJSONCodec<
  JamEntropy,
  Blake2bHash,
  string
>(HashJSONCodec());

export const IOTAJSONCodec = ValidatorDataArrayJSONCodec<JamState["iota"]>();
export const GammaKJSONCodec =
  ValidatorDataArrayJSONCodec<SafroleState["gamma_k"]>();
export const KappaJSONCodec = ValidatorDataArrayJSONCodec<JamState["kappa"]>();
export const LambdaJSONCodec =
  ValidatorDataArrayJSONCodec<JamState["lambda"]>();

export const RHOJSONCodec = ArrayOfJSONCodec<
  RHO,
  RHO[0],
  null | { report: any; timeout: number }
>(
  NULLORCodec(
    createJSONCodec([
      ["workReport", "report", WorkReportJSONCodec],
      ["reportTime", "timeout", NumberJSONCodec<Tau>()],
    ]),
  ),
);

export const AccumulationQueueJSONCodec: JSONCodec<
  AccumulationQueue,
  Array<
    Array<{
      report: WorkReportJSON;
      dependencies: string[];
    }>
  >
> = ArrayOfJSONCodec(
  ArrayOfJSONCodec(
    createJSONCodec([
      ["workReport", "report", WorkReportJSONCodec],
      [
        "dependencies",
        "dependencies",
        ZipJSONCodecs<string[], WorkPackageHash[], Set<WorkPackageHash>>(
          ArrayOfJSONCodec(HashJSONCodec<WorkPackageHash>()),
          SetJSONCodec(),
        ),
      ],
    ]),
  ),
);
