import {
  asCodec,
  E_4_int,
  eitherOneOfCodec,
  JamCodec,
  LengthDiscrimantedIdentityCodec,
  mapCodec,
  xBytesCodec,
} from "@tsjam/codec";
import { JamBlockImpl } from "@tsjam/core";
import { StateRootHash, u32 } from "@tsjam/types";
import { GetState } from "./get-state";
import { PeerInfo } from "./peer-info";
import { Initialize } from "./initialize";
import { State } from "./state";
import assert from "assert";

export enum MessageType {
  PEER_INFO = "PEER_INFO",
  IMPORT_BLOCK = "IMPORT_BLOCK",
  INITIALIZE = "INITIALIZE",
  GET_STATE = "GET_STATE",
  STATE = "STATE",
  STATE_ROOT = "STATE_ROOT",
  ERROR = "ERROR",
}
export class Message {
  peerInfo?: PeerInfo;
  initialize?: Initialize;
  stateRoot?: StateRootHash;
  importBlock?: JamBlockImpl;
  getState?: GetState;
  state?: State;
  error?: string;
  constructor(config?: Partial<Message>) {
    Object.assign(this, config);
  }

  type(): MessageType {
    if (this.peerInfo) return MessageType.PEER_INFO;
    if (this.importBlock) return MessageType.IMPORT_BLOCK;
    if (this.initialize) return MessageType.INITIALIZE;
    if (this.getState) return MessageType.GET_STATE;
    if (this.state) return MessageType.STATE;
    if (this.stateRoot) return MessageType.STATE_ROOT;
    if (this.error) return MessageType.ERROR;
    throw new Error("Invalid message type");
  }
}
export const oneOfMessageCodec = mapCodec(
  eitherOneOfCodec<Message>([
    ["peerInfo", asCodec(PeerInfo)],
    ["initialize", asCodec(Initialize)],
    ["stateRoot", xBytesCodec<StateRootHash, 32>(32)],
    ["importBlock", asCodec(JamBlockImpl)],
    ["getState", asCodec(GetState)],
    ["state", asCodec(State)],
    [
      "error",
      mapCodec(
        LengthDiscrimantedIdentityCodec,
        (b) => Buffer.from(b).toString("utf8"),
        (s) => Buffer.from(s, "utf8"),
      ),
      255,
    ],
  ]),
  (pojo: Message) => new Message(pojo),
  (message) => message,
);

export const MessageCodec: JamCodec<Message> = {
  encode(value, bytes) {
    const length = oneOfMessageCodec.encode(value, bytes.subarray(4));
    E_4_int.encode(<u32>length, bytes);
    return 4 + length;
  },

  decode(bytes) {
    const { value: length } = E_4_int.decode(bytes);
    const { value: pojo, readBytes } = oneOfMessageCodec.decode(
      bytes.subarray(4, 4 + length),
    );
    assert(readBytes === length, "MessageCodec: readBytes !== length");
    return {
      value: pojo,
      readBytes: 4 + length,
    };
  },

  encodedSize(value) {
    const length = oneOfMessageCodec.encodedSize(value);
    return 4 + length;
  },
};

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;
  const fs = await import("fs");
  describe("Message", () => {
    it("should encode and decode PeerInfo", () => {
      const bin = fs.readFileSync(
        `${__dirname}/../../../../jam-conformance/fuzz-proto/examples/v1/faulty/00000000_target_peer_info.bin`,
      );
      const { value: message } = oneOfMessageCodec.decode(bin);

      expect(message.type()).toBe(MessageType.PEER_INFO);

      expect(message).deep.eq({
        peerInfo: {
          name: "polkajam",
          appVersion: { major: 0, minor: 1, patch: 25 },
          jamVersion: { major: 0, minor: 7, patch: 0 },
          features: 2,
          fuzzVersion: 1,
        },
      });
    });
    it("should encode and decode Error", () => {
      const bin = fs.readFileSync(
        `${__dirname}/../../../../jam-conformance/fuzz-proto/examples/v1/faulty/00000006_target_error.bin`,
      );
      const { value: message } = oneOfMessageCodec.decode(bin);

      expect(message.type()).toBe(MessageType.ERROR);

      expect(message).deep.eq({
        error:
          "Chain error: block execution failure: reports error: wrong core assignment",
      });
    });
    it("should encode and decode Initialize", () => {
      const bin = fs.readFileSync(
        `${__dirname}/../../../../jam-conformance/fuzz-proto/examples/v1/faulty/00000001_fuzzer_initialize.bin`,
      );
      const { value: message } = oneOfMessageCodec.decode(bin);

      expect(message.type()).toBe(MessageType.INITIALIZE);

      expect(message.state?.toJSON()).deep.eq(
        JSON.parse(
          fs.readFileSync(
            `${__dirname}/../../../../jam-conformance/fuzz-proto/examples/v1/faulty/00000001_fuzzer_initialize.json`,
            "utf8",
          ),
        ).State,
      );
    });

    it("should encode and decode StateRoot", () => {
      const bin = fs.readFileSync(
        `${__dirname}/../../../../jam-conformance/fuzz-proto/examples/v1/faulty/00000001_target_state_root.bin`,
      );
      const { value: message } = oneOfMessageCodec.decode(bin);

      expect(message.type()).toBe(MessageType.STATE_ROOT);

      expect(message.state?.toJSON()).deep.eq(
        JSON.parse(
          fs.readFileSync(
            `${__dirname}/../../../../jam-conformance/fuzz-proto/examples/v1/faulty/00000001_target_state_root.json`,
            "utf8",
          ),
        ).State,
      );
    });

    it("should encode and decode ImportBlock", () => {
      const bin = fs.readFileSync(
        `${__dirname}/../../../../jam-conformance/fuzz-proto/examples/v1/faulty/00000002_fuzzer_import_block.bin`,
      );
      const { value: message } = oneOfMessageCodec.decode(bin);

      expect(message.type()).toBe(MessageType.IMPORT_BLOCK);

      expect(message.state?.toJSON()).deep.eq(
        JSON.parse(
          fs.readFileSync(
            `${__dirname}/../../../../jam-conformance/fuzz-proto/examples/v1/faulty/00000002_fuzzer_import_block.json`,
            "utf8",
          ),
        ).State,
      );
    });

    it("should encode and decode GetState", () => {
      const bin = fs.readFileSync(
        `${__dirname}/../../../../jam-conformance/fuzz-proto/examples/v1/faulty/00000030_fuzzer_get_state.bin`,
      );
      const { value: message } = oneOfMessageCodec.decode(bin);

      expect(message.type()).toBe(MessageType.GET_STATE);

      expect(message.state?.toJSON()).deep.eq(
        JSON.parse(
          fs.readFileSync(
            `${__dirname}/../../../../jam-conformance/fuzz-proto/examples/v1/faulty/00000030_fuzzer_get_state.json`,
            "utf8",
          ),
        ).State,
      );
    });
  });
}
