import {
  BandersnatchRingRoot,
  EPOCH_LENGTH,
  JamHeader,
  NUMBER_OF_VALIDATORS,
  TicketIdentifier,
  toTagged,
  UnTaggedObject,
  ValidatorData,
} from "@vekexasia/jam-types";
import { SafroleState } from "@/index";
import { IDisputesState } from "@/extrinsics";

export const mockHeader = (
  opts: Partial<UnTaggedObject<JamHeader>> = {},
): JamHeader => ({
  previousHash: toTagged(opts.previousHash || 0n),
  priorStateRoot: toTagged(opts.priorStateRoot || 0n),
  extrinsicHash: toTagged(opts.extrinsicHash || 0n),
  timeSlotIndex: toTagged(opts.timeSlotIndex || 0),
  judgementsMarkers: toTagged(
    opts.judgementsMarkers || [],
  ) as unknown as JamHeader["judgementsMarkers"],
  blockAuthorKey: opts.blockAuthorKey || 0,
  entropySignature: toTagged(opts.entropySignature || 0n),
});

export const mockState = (
  opts: Partial<UnTaggedObject<SafroleState>> = {},
): SafroleState => ({
  tau: toTagged(opts.tau ?? 0),
  eta: (opts.eta ?? [
    toTagged(0n),
    toTagged(0n),
    toTagged(0n),
    toTagged(0n),
  ]) as unknown as SafroleState["eta"],
  lambda: toTagged(opts.lambda ?? new Array(NUMBER_OF_VALIDATORS)),
  kappa: toTagged(opts.kappa ?? new Array(NUMBER_OF_VALIDATORS)),
  iota: toTagged(opts.iota ?? new Array(NUMBER_OF_VALIDATORS)),
  gamma_z: toTagged(0n as BandersnatchRingRoot),
  gamma_a: toTagged(opts.gamma_a ?? new Array(EPOCH_LENGTH)),
  gamma_s: toTagged(opts.gamma_s ?? new Array(EPOCH_LENGTH)),
  gamma_k: toTagged(opts.gamma_k ?? new Array(NUMBER_OF_VALIDATORS)),
});

export const mockValidatorData = (
  opts: Partial<UnTaggedObject<ValidatorData>> = {},
): ValidatorData => ({
  banderSnatch: toTagged(opts.banderSnatch || 0n),
  ed25519: toTagged(opts.ed25519 || 0n),
  blsKey: (opts.blsKey || new Uint8Array(144)) as ValidatorData["blsKey"],
  metadata: (opts.metadata || new Uint8Array(128)) as ValidatorData["metadata"],
});

export const mockTicketIdentifier = (
  opts: Partial<UnTaggedObject<TicketIdentifier>> = {},
): TicketIdentifier => ({
  id: toTagged(opts.id || 0n),
  attempt: opts.attempt || 0,
});

export const mockDisputesState = (
  opts: Partial<UnTaggedObject<IDisputesState>> = {},
): IDisputesState => ({
  psi_o: new Set(opts.psi_o || []),
  psi_g: new Set(opts.psi_g || []),
  psi_b: new Set(opts.psi_b || []),
  psi_w: new Set(opts.psi_w || []),
});
