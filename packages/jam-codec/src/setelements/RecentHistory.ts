import { E_M } from "@/E_M";
import { createCodec } from "../utils";
import { create32BCodec, HashCodec } from "@/identity";
import {
  HeaderHash,
  RecentHistory,
  RecentHistoryItem,
  StateRootHash,
} from "@tsjam/types";
import { buildKeyValueCodec } from "@/dicts/keyValue";
import { createArrayLengthDiscriminator } from "@/lengthdiscriminated/arrayLengthDiscriminator";
import { JamCodec } from "@/codec";

/**
 *
 * This is defined in C(3) of state merklization
 */
export const RecentHistoryCodec: JamCodec<RecentHistory> =
  createArrayLengthDiscriminator(
    createCodec<RecentHistoryItem>([
      ["headerHash", create32BCodec<HeaderHash>()],
      ["accumulationResultMMR", E_M],
      ["stateRoot", create32BCodec<StateRootHash>()],
      ["reportedPackages", buildKeyValueCodec(HashCodec)],
    ]),
  );
