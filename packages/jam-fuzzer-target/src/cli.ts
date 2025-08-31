import { E_sub_int, encodeWithCodec, xBytesCodec } from "@tsjam/codec";
import { getConstantsMode } from "@tsjam/constants";
import {
  IdentityMap,
  JamBlockExtrinsicsImpl,
  JamBlockImpl,
  JamStateImpl,
  merkleStateMap,
  stateFromMerkleMap,
} from "@tsjam/core";
import { HeaderHash } from "@tsjam/types";
import assert from "node:assert";
import fs from "node:fs";
import net from "node:net";
import { Message, MessageCodec, MessageType } from "./proto/message";
import { PeerInfo } from "./proto/peer-info";
import { State } from "./proto/state";
import { SetState } from "./proto/set-state";
import { parseArgs } from "node:util";

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

let state: JamStateImpl | null = null;
let historyMap: IdentityMap<HeaderHash, 32, SetState>;
const server = net.createServer((socket) => {
  const send = (message: Message) => {
    const bin = encodeWithCodec(MessageCodec, message);
    console.log(`-> ${bin.length}`);
    socket.write(bin);
  };
  let buffer: Buffer = Buffer.alloc(0);
  let toRead = -1;
  socket.on("data", (data) => {
    if (toRead === -1) {
      toRead = E_sub_int(4).decode(data).value + 4;
    }
    buffer = Buffer.concat([buffer, data]);
    if (buffer.length === toRead) {
      console.log("<-", buffer.length);
      onMessage(buffer);
      toRead = -1;
      buffer = Buffer.alloc(0); // Reset buffer after processing
    }
  });
  const onMessage = (data: Buffer) => {
    const message = MessageCodec.decode(data).value;
    console.log(`received message ${message.type()}`);
    switch (message.type()) {
      case MessageType.PEER_INFO:
        const pi = PeerInfo.build();
        send(new Message({ peerInfo: pi }));
        break;

      case MessageType.SET_STATE:
        const stateMap = message.setState!.state.value;
        state = stateFromMerkleMap(stateMap);
        state.block = new JamBlockImpl({
          header: message.setState!.header,
          extrinsics: JamBlockExtrinsicsImpl.newEmpty(),
        });
        state.headerLookupHistory = state.headerLookupHistory.toPosterior({
          header: message.setState!.header,
        });
        historyMap = new IdentityMap();
        historyMap.set(
          message.setState!.header.signedHash(),
          message.setState!,
        );
        send(new Message({ stateRoot: state.merkleRoot() }));
        break;

      case MessageType.IMPORT_BLOCK:
        const block = message.importBlock!;
        assert(state, "State must be initialized before applying a block");
        const res = state.applyBlock(block);
        if (res.isErr()) {
          console.log("Block application error:");
          console.log(res.error);
          send(new Message({ stateRoot: state.merkleRoot() }));
          return;
        }
        state = res.value;
        historyMap.set(
          block.header.signedHash(),
          new SetState({
            header: block.header,
            state: new State({ value: merkleStateMap(res.value) }),
          }),
        );

        send(new Message({ stateRoot: res.value.merkleRoot() }));
        break;

      case MessageType.GET_STATE:
        const oldState = historyMap.get(message.getState!.headerHash);
        assert(
          oldState,
          "State not found for header hash: " +
            xBytesCodec(32).toJSON(message.getState!.headerHash),
        );
        send(
          new Message({
            state: oldState.state,
          }),
        );
        break;

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
