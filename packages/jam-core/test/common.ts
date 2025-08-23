import { HashCodec } from "@/codecs/misc-codecs";
import {
  IdentityMap,
  MerkleServiceAccountStorageImpl,
  ServiceAccountImpl,
  SlotImpl,
} from "@/index";
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

  @eSubBigIntCodec(8, "deposit_offset")
  gratis!: Balance;

  @eSubIntCodec(4, "items")
  items!: u32; //a_i (virtual)

  @codec(SlotImpl, "creation_slot")
  creationSlot!: SlotImpl;

  @codec(SlotImpl, "last_accumulation_slot")
  lastAccumulationSlot!: SlotImpl; // a_l

  @eSubIntCodec(4, "parent_service")
  parentServiceId!: ServiceIndex; // a_p

  toServiceAccount(serviceIndex: ServiceIndex) {
    const account = new ServiceAccountImpl(
      {
        balance: this.balance,
        codeHash: this.codeHash,
        minAccGas: this.minItemGas,
        minMemoGas: this.minMemoGas,
        parent: this.parentServiceId,
        created: this.creationSlot,
        lastAcc: this.lastAccumulationSlot,
        preimages: new IdentityMap(),
        gratis: this.gratis,
      },
      new MerkleServiceAccountStorageImpl(serviceIndex),
    );
    account.itemInStorage = () => this.items;
    account.totalOctets = () => this.bytes;
    account.itemInStorage = () => this.items;
    account.totalOctets = () => this.bytes;
    return account;
  }
}
