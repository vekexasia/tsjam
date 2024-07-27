import { JamHeader, RingVRFProof, Tagged } from "@/index";

export interface JamBlock {
  header: JamHeader;
  extrinsics: JamBlockExtrinsics;
}
export interface JamBlockExtrinsics {
  // Et the maximum number of tickets in a block is
  // K=16 and it is allowed to be submitted only if current slot is less than Y=500 ( aka lottery did not end yet)
  // @see section 6.7
  tickets: Tagged<
    { entryIndex: 0 | 1; proof: RingVRFProof }[],
    "block-tickets",
    { maxLength: 16 }
  >;
  judgements: never[];
  preimages: never[];
  availability: never[];
  reports: never[];
}
