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
import { diff } from "jest-diff";
import net from "net";
import { parseArgs } from "node:util";

import { BufferJSONCodec, E_4_int, encodeWithCodec } from "@tsjam/codec";
import { EPOCH_LENGTH, getConstantsMode } from "@tsjam/constants";
import {
  AppliedBlock,
  ChainManager,
  IdentityMap,
  JamBlockExtrinsicsImpl,
  JamBlockImpl,
  JamStateImpl,
  SlotImpl,
  stateKey,
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
// Parse CLI args for socket path (fallback to env, then default)
const { values: cliArgs } = parseArgs({
  options: {
    socket: { type: "string", short: "s" },
  },
});
const SOCKET_PATH =
  (cliArgs.socket as string | undefined) ??
  process.env.SOCKET_PATH ??
  "/tmp/jam_target.sock";
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
  merkleMap: IdentityMap<StateKey, 31, Buffer>,
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
  const receivedState = JamStateImpl.fromMerkleMap(stateMap);
  const expectedMap = merkleMap;
  const expectedState = JamStateImpl.fromMerkleMap(expectedMap);
  console.log("state diverged");
  //console.error(
  //  "Expected state map:",
  //  IdentityMapCodec(xBytesCodec(31), LengthDiscrimantedIdentityCodec, {
  //    key: "key",
  //    value: "value",
  //  }).toJSON(expectedMap),
  //);

  for (const [key, value] of stateMap.entries()) {
    const expectedValue = expectedMap.get(key)!;
    if (Buffer.compare(value, expectedValue) !== 0) {
      reverseDifferentState(key, expectedState, receivedState);
      // throw new Error(
      //   // eslint-disable-next-line @typescript-eslint/no-explicit-any
      //   `State mismatch for key ${key.toString()}: expected ${BufferJSONCodec().toJSON(<any>expectedValue)}, got ${BufferJSONCodec().toJSON(<any>value)}`,
      // );
    }
  }
  if (
    stateMap.size !== expectedMap.size ||
    !Array.from(stateMap.keys()).every((key) => expectedMap.has(key))
  ) {
    throw new Error(
      `State mismatch: expected ${expectedMap.size} entries, got ${stateMap.size}`,
    );
  }
};

const reverseDifferentState = (
  key: StateKey,
  expected: JamStateImpl,
  actual: JamStateImpl,
) => {
  if (Buffer.compare(stateKey(1), key) === 0) {
    // authPool
    console.log(
      "authPool",
      diff(expected.authPool.toJSON(), actual.authPool.toJSON()),
    );
    return;
  } else if (Buffer.compare(stateKey(2), key) === 0) {
    // authQueue
    console.log(
      "authQueue",
      diff(expected.authQueue.toJSON(), actual.authQueue.toJSON()),
    );
    return;
  } else if (Buffer.compare(stateKey(3), key) === 0) {
    // beta
    console.log("beta", diff(expected.beta.toJSON(), actual.beta.toJSON()));
    return;
  } else if (Buffer.compare(stateKey(4), key) === 0) {
    // safrole
    console.log(
      "safrole",
      diff(expected.safroleState.toJSON(), actual.safroleState.toJSON()),
    );
    return;
  } else if (Buffer.compare(stateKey(5), key) === 0) {
    // disputes
    console.log(
      "disputes",
      diff(expected.disputes.toJSON(), actual.disputes.toJSON()),
    );
    return;
  } else if (Buffer.compare(stateKey(6), key) === 0) {
    // entropy
    console.log(
      "entropy",
      diff(expected.entropy.toJSON(), actual.entropy.toJSON()),
    );
    return;
  } else if (Buffer.compare(stateKey(7), key) === 0) {
    // iota
    console.log("iota", diff(expected.iota.toJSON(), actual.iota.toJSON()));
    return;
  } else if (Buffer.compare(stateKey(8), key) === 0) {
    // kappa
    console.log("kappa", diff(expected.kappa.toJSON(), actual.kappa.toJSON()));
    return;
  } else if (Buffer.compare(stateKey(9), key) === 0) {
    // lambda
    console.log(
      "lambda",
      diff(expected.lambda.toJSON(), actual.lambda.toJSON()),
    );
    return;
  } else if (Buffer.compare(stateKey(10), key) === 0) {
    // rho
    console.log("rho", diff(expected.rho.toJSON(), actual.rho.toJSON()));
    return;
  } else if (Buffer.compare(stateKey(11), key) === 0) {
    // slot
    console.log("slot", diff(expected.slot.toJSON(), actual.slot.toJSON()));
    return;
  } else if (Buffer.compare(stateKey(12), key) === 0) {
    // privServices
    console.log(
      "privServices",
      diff(expected.privServices.toJSON(), actual.privServices.toJSON()),
    );
    return;
  } else if (Buffer.compare(stateKey(13), key) === 0) {
    // statistics
    console.log(
      "statistics",
      diff(expected.statistics.toJSON(), actual.statistics.toJSON()),
    );
    return;
  } else if (Buffer.compare(stateKey(14), key) === 0) {
    // accumulation Queue
    console.log(
      "accumulationQueue",
      diff(
        expected.accumulationQueue.toJSON(),
        actual.accumulationQueue.toJSON(),
      ),
    );
    return;
  } else if (Buffer.compare(stateKey(15), key) === 0) {
    // accumulationHistory
    console.log(
      "accumulationHistory",
      diff(
        expected.accumulationHistory.toJSON(),
        actual.accumulationHistory.toJSON(),
      ),
    );
    return;
  } else if (Buffer.compare(stateKey(16), key) === 0) {
    //theta
    console.log(
      "theta",
      diff(
        expected.mostRecentAccumulationOutputs.toJSON(),
        actual.mostRecentAccumulationOutputs.toJSON(),
      ),
    );
    return;
  }

  for (const [serviceIndex, serviceAccount] of expected.serviceAccounts
    .elements) {
    if (Buffer.compare(stateKey(255, serviceIndex), key) === 0) {
      // its about this service
      //
      //
      console.log(
        `serviceAccount ${serviceIndex}`,
        diff(
          serviceAccount.toJSON(),
          actual.serviceAccounts.get(serviceIndex)?.toJSON() ?? {},
          {
            contextLines: 1,
            expand: false,
          },
        ),
      );
      return;
    }
  }
  // else it should be inside the account data which packs everything
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
    console.log("expected", BufferJSONCodec().toJSON(state.new.stateRoot));
    console.log("received", BufferJSONCodec().toJSON(responseStateRoot));
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
  let lastBlock = GENESIS;
  lastBlock = GENESIS;

  const merkleMap = GENESIS_STATE.merkle.map;
  // set genesis state
  const setState = new SetState({
    header: lastBlock.header,
    state: new State({ value: merkleMap }),
  });

  const stateRootResponse = await sendStuff(
    new Message({ setState }),
    MessageType.STATE_ROOT,
  );

  if (
    Buffer.compare(GENESIS_STATE.merkleRoot(), stateRootResponse.stateRoot!) !==
    0
  ) {
    return await compareState(
      GENESIS_STATE.merkle.map,
      lastBlock.header.signedHash(),
    );
  }

  const chainManager = await ChainManager.build(GENESIS);

  for (let i = EPOCH_LENGTH + 1; ; i++) {
    const p_tau = <Validated<Posterior<TauImpl>>>new SlotImpl(<u32>i);
    const newBlock = await produceBlock(lastBlock, p_tau, chainManager);
    console.log("Produced block for slot", i);
    console.dir(newBlock.toJSON(), { depth: null });
    const res = await sendStuff(
      new Message({ importBlock: newBlock }),
      MessageType.STATE_ROOT,
    );
    const isSuccess = await checkState(
      {
        new: new TraceState({
          stateRoot: newBlock.posteriorState.merkle.root,
          merkleMap: newBlock.posteriorState.merkle.map,
        }),
        prev: new TraceState({
          stateRoot: lastBlock.posteriorState.merkle.root,
          merkleMap: lastBlock.posteriorState.merkle.map,
        }),
      },
      newBlock.header.signedHash(),
      res.stateRoot!,
    );
    if (!isSuccess) {
      return;
    }
    lastBlock = newBlock;
  }
};

const sendSingleBlockFromTrace = async () => {
  console.log(getConstantsMode());
  assert(process.env.TRACE_PATH, "TRACE_PATH environment variable is not set");
  assert(
    fs.existsSync(process.env.TRACE_PATH),
    `TRACE_PATH ${process.env.TRACE_PATH} does not exist`,
  );
  assert(
    fs.statSync(process.env.TRACE_PATH).isDirectory(),
    "TRACE_PATH is not a directory",
  );
  const files = fs
    .readdirSync(process.env.TRACE_PATH)
    .filter((a) => a.endsWith(".bin"))
    .filter((a) => a !== "genesis.bin")
    .sort((a, b) => a.localeCompare(b));

  let lastBlock: AppliedBlock;
  if (fs.existsSync(path.join(process.env.TRACE_PATH, "genesis.bin"))) {
    console.log(`Loading trace from ${process.env.TRACE_PATH}`);
    const genesis = GenesisTrace.decode(
      fs.readFileSync(path.join(process.env.TRACE_PATH, "genesis.bin")),
    ).value;

    lastBlock = <AppliedBlock>new JamBlockImpl({
      header: genesis.header,
      extrinsics: JamBlockExtrinsicsImpl.newEmpty(),
      posteriorState: JamStateImpl.fromMerkleMap(genesis.state.merkleMap),
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
  } else {
    console.log(`initing using file order`);
    const [initialErr, initialTrace] = loadTrace(
      fs.readFileSync(path.join(process.env.TRACE_PATH, files[0])),
    ).safeRet();
    if (typeof initialErr !== "undefined") {
      console.log(initialErr);
      return;
    }
    const sr = await sendStuff(
      new Message({
        setState: new SetState({
          header: initialTrace.block.header,
          state: new State({ value: initialTrace.postState.merkleMap }),
        }),
      }),
      MessageType.STATE_ROOT,
    );

    if (Buffer.compare(sr.stateRoot!, initialTrace.postState.stateRoot) !== 0) {
      throw new Error("initial state root mismatch");
    }
    lastBlock = <AppliedBlock>initialTrace.block;
    lastBlock.posteriorState = JamStateImpl.fromMerkleMap(
      initialTrace.postState.merkleMap,
    );
    files.splice(0, 1);
  }
  for (const file of files) {
    console.log(file);
    const [traceErr, trace] = loadTrace(
      fs.readFileSync(path.join(process.env.TRACE_PATH, file)),
    ).safeRet();
    if (typeof traceErr !== "undefined") {
      console.error(`Error loading trace from ${file}: ${traceErr}`);
      continue; // we continue to load next one if any
    }
    const sr = await sendStuff(
      new Message({ importBlock: trace.block }),
      MessageType.STATE_ROOT,
    );
    const isSuccess = await checkState(
      {
        new: trace.postState,
        prev: trace.preState,
      },
      lastBlock.header.signedHash(),
      sr.stateRoot!,
    );
    if (!isSuccess) {
      console.error("State mismatch at block", trace.block.header.slot);
      process.exit(1);
    }
  }

  console.log("All good");
  process.exit(0);
};
