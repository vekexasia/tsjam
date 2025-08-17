import {
  HeaderEpochMarkerImpl,
  JamSignedHeaderImpl,
  SlotImpl,
  TauImpl,
} from "@tsjam/core";
import { u32, ValidatorIndex } from "@tsjam/types";
import { toTagged } from "@tsjam/utils";

export const GENESIS = new JamSignedHeaderImpl({
  parent: toTagged(new Uint8Array(32).fill(0)),
  parentStateRoot: toTagged(new Uint8Array(32).fill(0)),
  extrinsicHash: toTagged(new Uint8Array(32).fill(0)),
  slot: <TauImpl>new SlotImpl(<u32>0),
  epochMarker: new HeaderEpochMarkerImpl(),
  authorIndex: <ValidatorIndex>0,
  entropySource: toTagged(new Uint8Array(96).fill(0)),
  seal: toTagged(new Uint8Array(96).fill(0)),
});
