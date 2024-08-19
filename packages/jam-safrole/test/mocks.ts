import { JamHeader, toTagged } from "@vekexasia/jam-types";

export const mockHeader = (opts: {
  previousHash: bigint;
  priorStateRoot: bigint;
  exstrinsicHash: bigint;
  timeSlotIndex: number;
  judgementsMarkers: bigint[];
  blockAuthorKey: number;
  entropySignature: bigint;
  epochMarker: {
    entropy: bigint;
    validatorKeys: bigint[];
  };
  winningTickets: Array<{ id: bigint; attempt: 0 | 1 }>;
}): JamHeader => ({
  previousHash: toTagged(opts.previousHash || 0n),
  priorStateRoot: toTagged(opts.priorStateRoot || 0n),
  extrinsicHash: toTagged(opts.exstrinsicHash || 0n),
  timeSlotIndex: opts.timeSlotIndex || 0,
  judgementsMarkers: toTagged(
    opts.judgementsMarkers || [],
  ) as unknown as JamHeader["judgementsMarkers"],
  blockAuthorKey: opts.blockAuthorKey || 0,
  entropySignature: toTagged(opts.entropySignature || 0n),
});
