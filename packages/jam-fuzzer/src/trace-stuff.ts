import {
  BaseJamCodecable,
  codec,
  JamCodecable,
  LengthDiscrimantedIdentityCodec,
  xBytesCodec,
} from "@tsjam/codec";
import {
  IdentityMap,
  IdentityMapCodec,
  JamBlockImpl,
  JamSignedHeaderImpl,
} from "@tsjam/core";
import type { StateKey, StateRootHash } from "@tsjam/types";
import assert from "assert";
import { err, ok, Result } from "neverthrow";

@JamCodecable()
export class TraceState extends BaseJamCodecable {
  @codec(xBytesCodec(32), "state_root")
  stateRoot!: StateRootHash;

  @codec(
    IdentityMapCodec(xBytesCodec(31), LengthDiscrimantedIdentityCodec, {
      key: "key",
      value: "value",
    }),
    "keyvals",
  )
  merkleMap!: IdentityMap<StateKey, 31, Buffer>;

  constructor(config?: Pick<TraceState, "merkleMap" | "stateRoot">) {
    super();

    if (typeof config !== "undefined") {
      this.merkleMap = config.merkleMap;
      this.stateRoot = config.stateRoot;
    }
  }
}

@JamCodecable()
export class TraceStep extends BaseJamCodecable {
  @codec(TraceState, "pre_state")
  preState!: TraceState;

  @codec(JamBlockImpl)
  block!: JamBlockImpl;

  @codec(TraceState, "post_state")
  postState!: TraceState;
}

@JamCodecable()
export class GenesisTrace extends BaseJamCodecable {
  @codec(JamSignedHeaderImpl)
  header!: JamSignedHeaderImpl;
  @codec(TraceState)
  state!: TraceState;
}

export const loadTraceJSON = (bin: Buffer) => {
  const toRet = TraceStep.fromJSON(JSON.parse(bin.toString("utf8")));

  return toRet;
};

export const loadTrace = (bin: Buffer): Result<TraceStep, string> => {
  try {
    const toRet = TraceStep.decode(bin);

    assert(
      toRet.readBytes === bin.length,
      `readBytes ${toRet.readBytes} !== bin.length ${bin.length}`,
    );
    assert(
      Buffer.compare(toRet.value.toBinary(), bin) === 0,
      "cannot re-encode",
    );

    return ok(toRet.value);
  } catch (e) {
    return err((e as Error).message);
  }
};
