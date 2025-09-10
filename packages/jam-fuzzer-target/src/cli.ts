import { E_sub_int, encodeWithCodec, xBytesCodec } from "@tsjam/codec";
import { getConstantsMode } from "@tsjam/constants";
import {
  JamBlockExtrinsicsImpl,
  JamBlockImpl,
  JamStateDataBase,
  JamStateImpl,
} from "@tsjam/core";
import "@tsjam/utils";
import { err, ok, Result } from "neverthrow";
import assert from "node:assert";
import fs from "node:fs";
import net from "node:net";
import { parseArgs } from "node:util";
import { Message, MessageCodec, MessageType } from "./proto/message";
import { PeerInfo } from "./proto/peer-info";
import { State } from "./proto/state";
import { StateRootHash } from "@tsjam/types";

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

if (fs.existsSync(SOCKET_PATH)) fs.unlinkSync(SOCKET_PATH);

const decodeMessage = (data: Buffer): Result<Message, string> => {
  try {
    return ok(MessageCodec.decode(data).value);
  } catch (e) {
    return err("Decoding error: " + (e as Error).message);
  }
};

const server = net.createServer((socket) => {
  const send = (message: Message) => {
    const bin = encodeWithCodec(MessageCodec, message);
    console.log(`-> ${bin.length}`);
    socket.write(bin);
  };
  let buffer: Buffer = Buffer.alloc(0);
  let toRead = -1;
  let stateDB: JamStateDataBase;
  socket.on("data", (data) => {
    if (toRead === -1) {
      toRead = E_sub_int(4).decode(data).value + 4;
    }
    buffer = Buffer.concat([buffer, data]);
    if (buffer.length === toRead) {
      console.log("<-", buffer.length);
      onMessage(buffer)
        .catch((e) => {
          // in case of any error rethrow it.
          throw e;
        })
        .then(() => {
          toRead = -1;
          buffer = Buffer.alloc(0); // Reset buffer after processing
        });
    }
  });
  const onMessage = async (data: Buffer) => {
    const [errDecoding, message] = decodeMessage(data).safeRet();
    if (typeof errDecoding === "string") {
      if (data[0] === 1) {
        // import block deserialization error we do send back current state root
        console.error(`Error decoding block: ${errDecoding}`);
        send(new Message({ stateRoot: Buffer.alloc(32) as StateRootHash }));
        return;
      } else {
        console.error(`Error decoding message: ${errDecoding}`);
        return;
      }
    }

    console.log(`received message ${message.type()}`);
    switch (message.type()) {
      case MessageType.PEER_INFO:
        const pi = PeerInfo.build();
        send(new Message({ peerInfo: pi }));
        break;

      case MessageType.SET_STATE: {
        stateDB = new JamStateDataBase();
        const stateMap = message.setState!.state.value;
        const state = JamStateImpl.fromMerkleMap(stateMap);
        state.block = new JamBlockImpl({
          header: message.setState!.header,
          extrinsics: JamBlockExtrinsicsImpl.newEmpty(),
        });
        state.headerLookupHistory = state.headerLookupHistory.toPosterior({
          header: message.setState!.header,
        });
        await stateDB.save(state);
        send(new Message({ stateRoot: state.merkleRoot() }));
        break;
      }
      case MessageType.IMPORT_BLOCK: {
        const block = message.importBlock!;
        const state = await stateDB.fromHeaderHash(
          message.importBlock!.header.parent,
        );
        assert(state, "State must be initialized before applying a block");
        const res = state.applyBlock(block);
        if (res.isErr()) {
          console.log("Block application error:");
          console.log(res.error);
          send(new Message({ stateRoot: state.merkleRoot() }));
          return;
        }
        await stateDB.save(state);
        send(new Message({ stateRoot: res.value.merkleRoot() }));
        break;
      }
      case MessageType.GET_STATE: {
        const state = await stateDB.fromHeaderHash(
          message.getState!.headerHash,
        );
        assert(
          state,
          "State not found for header hash: " +
            xBytesCodec(32).toJSON(message.getState!.headerHash),
        );
        send(
          new Message({
            state: new State({ value: state.merkle.map }),
          }),
        );
        break;
      }
      default:
        console.error("Unhandled message type:", message.type());
    }
  };
  socket.on("error", (err) => console.error("Socket error:", err));
});

server.listen(SOCKET_PATH, () => {
  console.log("Listening on", SOCKET_PATH);
  console.log("constant mode", getConstantsMode());
  console.log(PeerInfo.build().toJSON());
});
server.on("error", (err) => console.error("Server error:", err));

export { server };
