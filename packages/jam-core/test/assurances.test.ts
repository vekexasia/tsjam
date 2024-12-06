import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import {
  assurancesExtrinsicFromJSON,
  validatorTestCodec,
  workReportTestCodec,
} from "@tsjam/codec/test/utils.js";
import { bigintToBytes, hextToBigInt } from "@tsjam/utils";
import {
  Dagger,
  EG_Extrinsic,
  JamState,
  RecentHistory,
  RHO,
  Posterior,
} from "@tsjam/types";
import { recentHistoryToPosterior } from "@tsjam/transitions";
import { verifyEA } from "@/verifySeal";
