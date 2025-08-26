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

import { BufferJSONCodec, E_4_int, encodeWithCodec } from "@tsjam/codec";
import { EPOCH_LENGTH } from "@tsjam/constants";
import {
  IdentityMap,
  JamBlockImpl,
  JamStateImpl,
  merkleStateMap,
  SlotImpl,
  stateFromMerkleMap,
  TauImpl,
} from "@tsjam/core";
import {
  HeaderHash,
  Posterior,
  StateKey,
  StateRootHash,
  u32,
  u8,
  Validated,
} from "@tsjam/types";
import packageJSON from "../package.json";
import { produceBlock } from "./block-generator";
import { GENESIS, GENESIS_STATE } from "./genesis";
import fs from "fs";

import path from "path";
import { loadTrace, TraceState } from "./trace-stuff";
import assert from "assert";
const SOCKET_PATH = "/tmp/jam_target.sock";
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

const compareState = async (
  merkleMap: IdentityMap<StateKey, 31, Uint8Array>,
  lastHeaderHash: HeaderHash,
) => {
  // request full state
  const fullState = await sendStuff(
    new Message({
      getState: new GetState({ headerHash: lastHeaderHash }),
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
  await sendSingleBlockFromTrace();
  // await generateBlocks();
});

const checkState = async (
  state: { new: TraceState; prev: TraceState },
  lastHeaderHash: HeaderHash,
  responseStateRoot: StateRootHash,
) => {
  if (Buffer.compare(state.new.stateRoot, responseStateRoot) !== 0) {
    console.log("State roots differ");
    if (Buffer.compare(state.prev.stateRoot, responseStateRoot) === 0) {
      console.log("But previous state root matches");
      console.log("Block was not applied from target");
    } else {
      await compareState(state.new.merkleMap, lastHeaderHash);
    }
    return false;
  }
  return true;
};

const generateBlocks = async () => {
  let state: JamStateImpl = GENESIS_STATE;
  state = GENESIS_STATE;
  let lastBlock: JamBlockImpl = GENESIS;
  lastBlock = GENESIS;

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
    return await compareState(
      merkleStateMap(state),
      lastBlock.header.signedHash(),
    );
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
    const isSuccess = await checkState(
      {
        new: new TraceState({
          stateRoot: newState.merkleRoot(),
          merkleMap: merkleStateMap(newState),
        }),
        prev: new TraceState({
          stateRoot: state.merkleRoot(),
          merkleMap: merkleStateMap(state),
        }),
      },
      newState.block!.header.signedHash(),
      res.stateRoot!,
    );
    if (!isSuccess) {
      return;
    }
    state = newState;
    lastBlock = newState.block!;
  }
};

const sendSingleBlockFromTrace = async () => {
  assert(process.env.TRACE_PATH, "TRACE_PATH environment variable is not set");
  assert(
    fs.existsSync(process.env.TRACE_PATH),
    `TRACE_PATH ${process.env.TRACE_PATH} does not exist`,
  );
  console.log(`Loading trace from ${process.env.TRACE_PATH}`);
  const trace = loadTrace(fs.readFileSync(process.env.TRACE_PATH, "utf8"));
  const dir = path.dirname(process.env.TRACE_PATH!);
  const files = fs.readdirSync(dir).filter((a) => a.endsWith(".json"));
  const index = files.findIndex(
    (a) => path.basename(a) === path.basename(process.env.TRACE_PATH!),
  );

  console.log(
    `Loading prevTrace from ${path.join(dir, files[index - 1])} (index ${index})`,
  );
  const prevTrace = loadTrace(
    fs.readFileSync(path.join(dir, files[index - 1]), "utf8"),
  );
  const sr = await sendStuff(
    new Message({
      setState: new SetState({
        header: prevTrace.block.header,
        state: new State({ value: trace.preState.merkleMap }),
      }),
    }),
    MessageType.STATE_ROOT,
  );

  console.log("Checking pre-state");
  console.log(BufferJSONCodec().toJSON(trace.preState.stateRoot));
  console.log(TraceState.codecOf("merkleMap").toJSON(trace.preState.merkleMap));
  if (Buffer.compare(trace.preState.stateRoot, sr.stateRoot!) !== 0) {
    return await compareState(
      trace.preState.merkleMap,
      prevTrace.block.header.signedHash(),
    );
  }
  console.log("Pre-state good, sending block");

  const res = await sendStuff(
    new Message({ importBlock: trace.block }),
    MessageType.STATE_ROOT,
  );

  const isSuccess = await checkState(
    { new: trace.postState, prev: trace.preState },
    prevTrace.block.header.signedHash(),
    res.stateRoot!,
  );
  if (!isSuccess) {
    return;
  }

  console.log("All good");
};
