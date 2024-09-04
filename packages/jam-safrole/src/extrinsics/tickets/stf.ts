// compute `n` (76)
import {
  Posterior,
  SafroleState,
  TicketExtrinsics,
  TicketIdentifier,
  u32,
} from "@vekexasia/jam-types";
import { Bandersnatch } from "@vekexasia/jam-crypto";
import assert from "node:assert";
import {
  JAM_TICKET_SEAL,
  LOTTERY_MAX_SLOT,
  MAX_TICKETS_PER_BLOCK,
} from "@vekexasia/jam-constants";
import { bigintToBytes, newSTF, slotIndex } from "@vekexasia/jam-utils";
