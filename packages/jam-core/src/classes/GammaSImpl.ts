import {
  ArrayOfJSONCodec,
  BandersnatchCodec,
  BaseJamCodecable,
  BufferJSONCodec,
  E_1,
  JamCodec,
  createSequenceCodec,
  sequenceCodec,
} from "@tsjam/codec";
import { EPOCH_LENGTH } from "@tsjam/constants";
import {
  BandersnatchKey,
  GammaS,
  GammaSFallback,
  SeqOfLength,
} from "@tsjam/types";
import { TicketImpl } from "./TicketImpl";

export class GammaSImpl extends BaseJamCodecable implements GammaS {
  @sequenceCodec(EPOCH_LENGTH, {
    ...BandersnatchCodec,
    ...BufferJSONCodec<BandersnatchKey, 32>(),
  })
  keys?: GammaSFallback;
  @sequenceCodec(EPOCH_LENGTH, TicketImpl)
  tickets?: SeqOfLength<TicketImpl, typeof EPOCH_LENGTH, "gamma_s">;

  isFallback(): boolean {
    return this.keys !== undefined;
  }

  static encode<T extends typeof BaseJamCodecable>(
    this: T,
    x: InstanceType<T>,
    buf: Uint8Array,
  ): number {
    if (x instanceof GammaSImpl === false) {
      throw new Error(
        `GammaSImpl.encode expects GammaSImpl, got ${x.constructor.name}`,
      );
    }
    if (x.isFallback()) {
      E_1.encode(1n, buf);
      return 1 + GammaSImpl.codecOf("keys").encode(x.keys!, buf.subarray(x));
    } else {
      E_1.encode(0n, buf);
      return (
        1 + GammaSImpl.codecOf("tickets").encode(x.tickets!, buf.subarray(1))
      );
    }
  }

  static decode<T extends typeof BaseJamCodecable>(
    this: T,
    bytes: Uint8Array,
  ): { value: InstanceType<T>; readBytes: number } {
    const isFallback = E_1.decode(bytes.subarray(0, 1)).value === 1n;
    const codec = GammaSImpl.codecOf(isFallback ? "keys" : "tickets");
    const { value, readBytes } = createSequenceCodec(
      EPOCH_LENGTH,
      codec as unknown as JamCodec<any>,
    ).decode(bytes.subarray(1));
    const toRet = new GammaSImpl();

    if (isFallback) {
      toRet.keys = value as GammaSFallback;
    } else {
      toRet.tickets = value as SeqOfLength<
        TicketImpl,
        typeof EPOCH_LENGTH,
        "gamma_s"
      >;
    }
    return { value: toRet as unknown as InstanceType<T>, readBytes };
  }

  static encodedSize<T extends typeof BaseJamCodecable>(
    this: T,
    value: InstanceType<T>,
  ): number {
    if (!(value instanceof GammaSImpl)) {
      throw new Error(
        `GammaSImpl.encodedSize expects GammaSImpl, got ${value.constructor.name}`,
      );
    }
    if (value.isFallback()) {
      return 1 + GammaSImpl.codecOf("keys").encodedSize(value.keys!);
    } else {
      return 1 + GammaSImpl.codecOf("tickets").encodedSize(value.tickets!);
    }
  }

  static fromJSON(json: any): GammaSImpl {
    const toRet = new GammaSImpl();
    if (typeof json.keys !== "undefined") {
      toRet.normal = <any>ArrayOfJSONCodec(BufferJSONCodec).fromJSON(json.keys);
    }
    return toRet;
  }

  static toJSON<T>(value: T): object {
    throw new Error("stub!");
  }
}
