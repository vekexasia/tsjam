import { EPOCH_LENGTH, NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import {
  BandersnatchKey,
  BandersnatchRingRoot,
  ED25519PublicKey,
  IDisputesState,
  JamHeader,
  SafroleState,
  Tau,
  Ticket,
  UnTaggedObject,
  ValidatorData,
  ValidatorIndex,
} from "@tsjam/types";
import { toTagged } from "@tsjam/utils";

export const mockHeader = (
  opts: Partial<UnTaggedObject<JamHeader>> = {},
): JamHeader => ({
  parent: toTagged(opts.parent || 0n),
  priorStateRoot: toTagged(opts.priorStateRoot || 0n),
  extrinsicHash: toTagged(opts.extrinsicHash || 0n),
  timeSlotIndex: toTagged(opts.timeSlotIndex || 0) as Tau,
  offenders: toTagged(
    opts.offenders || [],
  ) as unknown as JamHeader["offenders"],
  blockAuthorKeyIndex: (opts.blockAuthorKeyIndex || 0) as ValidatorIndex,
  entropySignature: toTagged(
    opts.entropySignature || new Uint8Array(96).fill(0),
  ),
});

export const mockState = (
  opts: Partial<UnTaggedObject<SafroleState>> = {},
): SafroleState => ({
  gamma_z: toTagged(new Uint8Array(144).fill(0) as BandersnatchRingRoot),
  gamma_a: toTagged(opts.gamma_a ?? new Array(EPOCH_LENGTH)),
  gamma_s: toTagged(opts.gamma_s ?? new Array(EPOCH_LENGTH)),
  gamma_p: toTagged(opts.gamma_p ?? new Array(NUMBER_OF_VALIDATORS)),
});

export const mockValidatorData = (
  opts: Partial<UnTaggedObject<ValidatorData>> = {},
): ValidatorData => ({
  banderSnatch: (toTagged(opts.banderSnatch) ||
    toTagged(new Uint8Array(32).fill(0))) as unknown as BandersnatchKey,
  ed25519: {
    buf: (opts.ed25519?.buf ||
      new Uint8Array(32).fill(0)) as ED25519PublicKey["buf"],
    bigint: (opts.ed25519?.bigint || 0n) as ED25519PublicKey["bigint"],
  },
  blsKey: (opts.blsKey ||
    new Uint8Array(144).fill(0)) as ValidatorData["blsKey"],
  metadata: (opts.metadata ||
    new Uint8Array(128).fill(0)) as ValidatorData["metadata"],
});

export const mockTicketIdentifier = (
  opts: Partial<UnTaggedObject<Ticket>> = {},
): Ticket => ({
  id: toTagged(opts.id || 0n),
  attempt: opts.attempt || 0,
});

export const mockDisputesState = (
  opts: Partial<UnTaggedObject<IDisputesState>> = {},
): IDisputesState => ({
  offenders: new Set(opts.offenders || []),
  good: new Set(opts.good || []),
  bad: new Set(opts.bad || []),
  wonky: new Set(opts.wonky || []),
});
