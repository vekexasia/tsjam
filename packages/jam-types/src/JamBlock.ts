import { JamHeader } from "@/index";

export interface JamBlock {
  header: JamHeader;
  extrinsics: JamBlockExtrinsics;
}
export interface JamBlockExtrinsics {
  tickets: never[];
  judgements: never[];
  preimages: never[];
  availability: never[];
  reports: never[];
}
