import {
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
import { SetState } from "./set-state";
import { State } from "./state";

export enum MessageType {
  PEER_INFO = 0,
  IMPORT_BLOCK = 1,
  SET_STATE = 2,
  GET_STATE = 3,
  STATE = 4,
  STATE_ROOT = 5,
}
export class Message {
  peerInfo?: PeerInfo;
  importBlock?: JamBlockImpl;
  setState?: SetState;
  getState?: GetState;
  state?: State;
  stateRoot?: StateRootHash;
  constructor(config?: Partial<Message>) {
    Object.assign(this, config);
  }

  type(): MessageType {
    if (this.peerInfo) return MessageType.PEER_INFO;
    if (this.importBlock) return MessageType.IMPORT_BLOCK;
    if (this.setState) return MessageType.SET_STATE;
    if (this.getState) return MessageType.GET_STATE;
    if (this.state) return MessageType.STATE;
    if (this.stateRoot) return MessageType.STATE_ROOT;
    throw new Error("Invalid message type");
  }
}
export const oneOfMessageCodec = mapCodec(
  eitherOneOfCodec<Message>([
    ["peerInfo", <JamCodec<PeerInfo>>PeerInfo],
    ["importBlock", <JamCodec<JamBlockImpl>>JamBlockImpl],
    ["setState", <JamCodec<SetState>>SetState],
    ["getState", <JamCodec<GetState>>GetState],
    ["state", <JamCodec<State>>State],
    ["stateRoot", xBytesCodec<StateRootHash, 32>(32)],
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
    const { value: pojo } = oneOfMessageCodec.decode(
      bytes.subarray(4, 4 + length),
    );
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
    it.skip("should encode and decode PeerInfo", () => {
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
    it.skip("should encode and decode GetState", () => {
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
    it.skip("should encode and decode State", () => {
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
    it.skip("should encode and decode Block", () => {
      const bin = fs.readFileSync(
        `${__dirname}/../../test/fixtures/4_block.bin`,
      );
      const { value: message } = oneOfMessageCodec.decode(bin);

      expect(message.type()).toBe(MessageType.IMPORT_BLOCK);

      expect(message.importBlock?.toJSON()).deep.eq(
        JSON.parse(
          fs.readFileSync(
            `${__dirname}/../../test/fixtures/4_block.json`,
            "utf8",
          ),
        ).Block,
      );
    });
    it.skip("should encode and decode SetState", () => {
      const bin = fs.readFileSync(
        `${__dirname}/../../test/fixtures/2_set_state.bin`,
      );
      const { value: message } = oneOfMessageCodec.decode(bin);

      expect(message.type()).toBe(MessageType.SET_STATE);

      expect(message.setState?.toJSON()).deep.eq(
        JSON.parse(
          fs.readFileSync(
            `${__dirname}/../../test/fixtures/2_set_state.json`,
            "utf8",
          ),
        ).State,
      );
    });
  });
}
