import {
  asCodec,
  E_4_int,
  eitherOneOfCodec,
  JamCodec,
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
  error?: "error";
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
      {
        encode() {
          return 0;
        },
        decode() {
          return { value: "error", readBytes: 0 };
        },
        encodedSize() {
          return 0;
        },
      },
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
  describe.skip("Message", () => {
    it("should encode and decode PeerInfo", () => {
      const bin = fs.readFileSync(
        `${__dirname}/../../test/fixtures/0_peer_info.bin`,
      );
      const { value: message } = oneOfMessageCodec.decode(bin);

      expect(message.type()).toBe(MessageType.PEER_INFO);

      expect(message).deep.eq({
        peerInfo: {
          name: "fuzzer",
          appVersion: { major: 0, minor: 1, patch: 24 },
          jamVersion: { major: 0, minor: 6, patch: 7 },
        },
      });
    });
    it("should encode and decode GetState", () => {
      const bin = fs.readFileSync(
        `${__dirname}/../../test/fixtures/12_get_state.bin`,
      );
      const { value: message } = oneOfMessageCodec.decode(bin);

      expect(message.type()).toBe(MessageType.GET_STATE);

      expect(message).deep.eq({
        getState: {
          headerHash: Buffer.from(
            "ebb6aede4c24e43fae47cf6324ed4c1d353119935d277794f2366fd0135cf6bc",
            "hex",
          ),
        },
      });
    });
    it("should encode and decode State", () => {
      const bin = fs.readFileSync(
        `${__dirname}/../../test/fixtures/13_state.bin`,
      );
      const { value: message } = oneOfMessageCodec.decode(bin);

      expect(message.type()).toBe(MessageType.STATE);

      expect(message.state?.toJSON()).deep.eq(
        JSON.parse(
          fs.readFileSync(
            `${__dirname}/../../test/fixtures/13_state.json`,
            "utf8",
          ),
        ).State,
      );
    });
  });
}
