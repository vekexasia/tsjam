import {
  BandersnatchRingRoot,
  JamHeader,
  TicketIdentifier,
  toTagged,
  UnTaggedObject,
  ValidatorData,
} from "@vekexasia/jam-types";
import { SafroleState } from "@/index";

export const mockHeader = (
  opts: Partial<UnTaggedObject<JamHeader>>,
): JamHeader => ({
  previousHash: toTagged(opts.previousHash || 0n),
  priorStateRoot: toTagged(opts.priorStateRoot || 0n),
  extrinsicHash: toTagged(opts.extrinsicHash || 0n),
  timeSlotIndex: opts.timeSlotIndex || 0,
  judgementsMarkers: toTagged(
    opts.judgementsMarkers || [],
  ) as unknown as JamHeader["judgementsMarkers"],
  blockAuthorKey: opts.blockAuthorKey || 0,
  entropySignature: toTagged(opts.entropySignature || 0n),
});

export const mockState = (
  opts: Partial<UnTaggedObject<SafroleState>>,
): SafroleState => ({
  tau: toTagged(opts.tau ?? 0),
  eta: (opts.eta ?? [
    toTagged(0n),
    toTagged(0n),
    toTagged(0n),
    toTagged(0n),
  ]) as unknown as SafroleState["eta"],
  lambda: toTagged(opts.lambda ?? []),
  kappa: toTagged(opts.kappa ?? []),
  iota: toTagged(opts.iota ?? []),
  gamma_z: toTagged(0n as BandersnatchRingRoot),
  gamma_a: toTagged(opts.gamma_a ?? []),
  gamma_s: toTagged(opts.gamma_s ?? []),
  gamma_k: toTagged(opts.gamma_k ?? []),
});

export const mockValidatorData = (
  opts: Partial<UnTaggedObject<ValidatorData>>,
): ValidatorData => ({
  banderSnatch: toTagged(opts.banderSnatch || 0n),
  ed25519: toTagged(opts.ed25519 || 0n),
  blsKey: (opts.blsKey || new Uint8Array(144)) as ValidatorData["blsKey"],
  metadata: (opts.metadata || new Uint8Array(128)) as ValidatorData["metadata"],
});

export const mockTicketIdentifier = (
  opts: Partial<UnTaggedObject<TicketIdentifier>>,
): TicketIdentifier => ({
  id: toTagged(opts.id || 0n),
  attempt: opts.attempt || 0,
});