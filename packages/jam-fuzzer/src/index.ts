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
  JamBlockExtrinsicsImpl,
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
import fs from "fs";
import packageJSON from "../package.json";
import { produceBlock } from "./block-generator";
import { GENESIS, GENESIS_STATE } from "./genesis";

import assert from "assert";
import path from "path";
import { GenesisTrace, loadTrace, TraceState } from "./trace-stuff";
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  assert(
    fs.statSync(process.env.TRACE_PATH).isDirectory(),
    "TRACE_PATH is not a directory",
  );
  assert(
    fs.existsSync(path.join(process.env.TRACE_PATH, "genesis.bin")),
    "genesis.json not found in TRACE_PATH",
  );

  console.log(`Loading trace from ${process.env.TRACE_PATH}`);
  const genesis = GenesisTrace.decode(
    fs.readFileSync(path.join(process.env.TRACE_PATH, "genesis.bin")),
  ).value;

  const files = fs
    .readdirSync(process.env.TRACE_PATH)
    .filter((a) => a.endsWith(".bin"))
    .filter((a) => a !== "genesis.bin")
    .sort((a, b) => a.localeCompare(b));

  const state = stateFromMerkleMap(genesis.state.merkleMap);
  state.block = new JamBlockImpl({
    header: genesis.header,
    extrinsics: JamBlockExtrinsicsImpl.newEmpty(),
  });

  const sr = await sendStuff(
    new Message({
      setState: new SetState({
        header: genesis.header,
        state: new State({ value: genesis.state.merkleMap }),
      }),
    }),
    MessageType.STATE_ROOT,
  );
  if (Buffer.compare(sr.stateRoot!, genesis.state.stateRoot) !== 0) {
    throw new Error("Genesis state root mismatch");
  }

  for (const file of files) {
    console.log(file);
    const trace = loadTrace(
      fs.readFileSync(path.join(process.env.TRACE_PATH, file)),
    );
    const sr = await sendStuff(
      new Message({ importBlock: trace.block }),
      MessageType.STATE_ROOT,
    );
    const isSuccess = await checkState(
      {
        new: trace.postState,
        prev: trace.preState,
      },
      state.block!.header.signedHash(),
      sr.stateRoot!,
    );
    if (!isSuccess) {
      console.error("State mismatch at block", trace.block.header.slot);
      return;
    }
  }

  console.log("All good");
  process.exit(0);
};
