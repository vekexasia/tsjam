import {
  GetState,
  Message,
  MessageCodec,
  MessageType,
  PeerInfo,
  SetState,
  State,
  Version,
} from "@tsjam/fuzzer-target";
import net from "net";

import {
  BufferJSONCodec,
  E_4_int,
  encodeWithCodec,
  LengthDiscrimantedIdentityCodec,
  xBytesCodec,
} from "@tsjam/codec";
import {
  IdentityMapCodec,
  JamBlockImpl,
  JamStateImpl,
  merkleStateMap,
  SlotImpl,
  TauImpl,
} from "@tsjam/core";
import { Posterior, StateRootHash, u32, u8, Validated } from "@tsjam/types";
import packageJSON from "../package.json";
import { GENESIS, GENESIS_STATE } from "./genesis";
import { EPOCH_LENGTH, NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import { produceBlock } from "./block-generator";
const SOCKET_PATH = "/tmp/jam_target.sock";

let state: JamStateImpl = GENESIS_STATE;
state = GENESIS_STATE;
let lastBlock: JamBlockImpl = GENESIS;
lastBlock = GENESIS;

const sendStuff = (
  message: Message,
  responseType: MessageType,
): Promise<Message> => {
  const buf = encodeWithCodec(MessageCodec, message);
  return new Promise((resolve, reject) => {
    let buffer = Buffer.alloc(0);
    let toRead = 0;
    const listener = (data: Buffer) => {
      if (toRead === 0) {
        toRead = E_4_int.decode(data).value + 4; // Read the length prefix
      }
      buffer = Buffer.concat([buffer, data]);
      if (buffer.length === toRead) {
        client.off("data", listener);
        // console.log(`<- ${buffer.length}`);
        const value = MessageCodec.decode(buffer).value;
        if (value.type() !== responseType) {
          return reject(new Error(`Unexpected response type: ${value.type()}`));
        }
        resolve(value);
      }
    };
    client.on("data", listener);
    client.write(buf, (err) => {
      if (err) return reject(err);
      // console.log(`-> ${buf.length}`);
    });
  });
};

const compareState = async () => {
  const merkleMap = merkleStateMap(state);
  // request full state
  const fullState = await sendStuff(
    new Message({
      getState: new GetState({ headerHash: lastBlock.header.signedHash() }),
    }),
    MessageType.STATE,
  );

  const stateMap = fullState.state!.value;
  const expectedMap = merkleMap;
  console.log("state diverged");
  //console.error(
  //  "Expected state map:",
  //  IdentityMapCodec(xBytesCodec(31), LengthDiscrimantedIdentityCodec, {
  //    key: "key",
  //    value: "value",
  //  }).toJSON(expectedMap),
  //);

  if (
    stateMap.size !== expectedMap.size ||
    !Array.from(stateMap.keys()).every((key) => expectedMap.has(key))
  ) {
    throw new Error(
      `State mismatch: expected ${expectedMap.size} entries, got ${stateMap.size}`,
    );
  }

  for (const [key, value] of stateMap.entries()) {
    const expectedValue = expectedMap.get(key)!;
    if (Buffer.compare(value, expectedValue) !== 0) {
      throw new Error(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        `State mismatch for key ${key.toString()}: expected ${BufferJSONCodec().toJSON(<any>expectedValue)}, got ${BufferJSONCodec().toJSON(<any>value)}`,
      );
    }
  }
};

const client = net.createConnection({ path: SOCKET_PATH }, async () => {
  console.log("Connected to server at", SOCKET_PATH);
  const fuzzerPeer = new PeerInfo();
  fuzzerPeer.name = "tsjam-fuzzer";
  fuzzerPeer.jamVersion = new Version();
  fuzzerPeer.jamVersion.major = <u8>(
    parseInt(packageJSON["jam:protocolVersion"].split(".")[0])
  );
  fuzzerPeer.jamVersion.minor = <u8>(
    parseInt(packageJSON["jam:protocolVersion"].split(".")[1])
  );
  fuzzerPeer.jamVersion.patch = <u8>(
    parseInt(packageJSON["jam:protocolVersion"].split(".")[2])
  );
  fuzzerPeer.appVersion = new Version();
  fuzzerPeer.appVersion.major = <u8>(
    parseInt(packageJSON["version"].split(".")[0])
  );
  fuzzerPeer.appVersion.minor = <u8>(
    parseInt(packageJSON["version"].split(".")[1])
  );
  fuzzerPeer.appVersion.patch = <u8>(
    parseInt(packageJSON["version"].split(".")[2])
  );

  const peerResponse = await sendStuff(
    new Message({ peerInfo: fuzzerPeer }),
    MessageType.PEER_INFO,
  );
  console.log(`Server Peer: `, peerResponse.peerInfo!.toJSON());

  const merkleMap = merkleStateMap(state);
  // set genesis state
  const setState = new SetState({
    header: lastBlock.header,
    state: new State({ value: merkleMap }),
  });

  const stateRootResponse = await sendStuff(
    new Message({ setState }),
    MessageType.STATE_ROOT,
  );

  if (Buffer.compare(state.merkleRoot(), stateRootResponse.stateRoot!) !== 0) {
    return await compareState();
  }

  for (let i = EPOCH_LENGTH + 1; ; i++) {
    const p_tau = <Validated<Posterior<TauImpl>>>new SlotImpl(<u32>i);
    const newState = produceBlock(state, p_tau);
    console.log("Produced block for slot", i);
    console.dir(newState.block!.toJSON(), { depth: null });
    const res = await sendStuff(
      new Message({ importBlock: newState.block! }),
      MessageType.STATE_ROOT,
    );
    if (Buffer.compare(newState.merkleRoot(), res.stateRoot!) !== 0) {
      return await compareState();
    }
    state = newState;
  }
});
