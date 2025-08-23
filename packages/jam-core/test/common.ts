import { HashCodec } from "@/codecs/misc-codecs";
import { SlotImpl } from "@/index";
import {
  BaseJamCodecable,
  codec,
  eSubBigIntCodec,
  eSubIntCodec,
  JamCodecable,
} from "@tsjam/codec";
import type {
  Balance,
  CodeHash,
  Gas,
  ServiceIndex,
  u32,
  u64,
} from "@tsjam/types";

@JamCodecable()
export class TestServiceInfo extends BaseJamCodecable {
  @codec(HashCodec, "code_hash")
  codeHash!: CodeHash; // a_c

  @eSubBigIntCodec(8, "balance")
  balance!: Balance; //a_b

  @eSubBigIntCodec(8, "min_item_gas")
  minItemGas!: Gas; //a_g
  @eSubBigIntCodec(8, "min_memo_gas")
  minMemoGas!: Gas; //a_m
  @eSubBigIntCodec(8, "bytes")
  bytes!: u64; //a_o (virtual)
  @eSubIntCodec(4, "items")
  items!: u32; //a_i (virtual)
  @codec(SlotImpl, "creation_slot")
  creationSlot!: SlotImpl;
  @codec(SlotImpl, "last_accumulation_slot")
  lastAccumulationSlot!: SlotImpl; // a_l
  @eSubIntCodec(4, "parent_service")
  parentServiceId!: ServiceIndex; // a_p
}
