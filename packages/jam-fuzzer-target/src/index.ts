import net from "node:net";
import fs from "node:fs";
import { Message, MessageCodec, MessageType } from "./proto/message";
import { PeerInfo } from "./proto/peer-info";
import { HeaderHash } from "@tsjam/types";
import { encodeWithCodec, xBytesCodec } from "@tsjam/codec";
import {
  IdentityMap,
  JamStateImpl,
  merkleStateMap,
  stateFromMerkleMap,
} from "@tsjam/core";
import assert from "node:assert";
import { State } from "./proto/state";
import { getConstantsMode } from "@tsjam/constants";

const SOCKET_PATH = "/tmp/jam_target.sock";
if (fs.existsSync(SOCKET_PATH)) fs.unlinkSync(SOCKET_PATH);

let state: JamStateImpl | null = null;
let historyMap: IdentityMap<HeaderHash, 32, JamStateImpl>;
const server = net.createServer((socket) => {
  socket.on("data", (data) => {
    const message = MessageCodec.decode(data).value;
    switch (message.type()) {
      case MessageType.PEER_INFO:
        const pi = PeerInfo.build();

        socket.write(
          encodeWithCodec(MessageCodec, new Message({ peerInfo: pi })),
        );
        break;

      case MessageType.SET_STATE:
        const stateMap = message.setState!.state.value;
        state = stateFromMerkleMap(stateMap);
        historyMap = new IdentityMap();
        socket.write(
          encodeWithCodec(
            MessageCodec,
            new Message({ stateRoot: state.merkleRoot() }),
          ),
        );
        break;

      case MessageType.IMPORT_BLOCK:
        const block = message.importBlock!;
        assert(state, "State must be initialized before applying a block");
        const res = state.applyBlock(block);
        assert(res.isOk(), "Block application failed: " + res);
        state = res.value;
        historyMap.set(block.header.signedHash(), state);

        socket.write(
          encodeWithCodec(
            MessageCodec,
            new Message({ stateRoot: res.value.merkleRoot() }),
          ),
        );
        break;

      case MessageType.GET_STATE:
        const oldState = historyMap.get(message.getState!.headerHash);
        assert(
          oldState,
          "State not found for header hash: " +
            xBytesCodec(32).toJSON(message.getState!.headerHash),
        );
        socket.write(
          encodeWithCodec(
            MessageCodec,
            new Message({
              state: new State({
                value: merkleStateMap(oldState),
              }),
            }),
          ),
        );
        break;

      default:
        console.error("Unhandled message type:", message.type());
    }
  });
  socket.on("error", (err) => console.error("Socket error:", err));
});

server.listen(SOCKET_PATH, () => {
  console.log("Listening on", SOCKET_PATH);
  console.log("constant mode", getConstantsMode());
  console.log(PeerInfo.build().toJSON());
});
server.on("error", (err) => console.error("Server error:", err));
