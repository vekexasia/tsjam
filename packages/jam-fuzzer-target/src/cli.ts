import { E_sub_int, encodeWithCodec, xBytesCodec } from "@tsjam/codec";
import { getConstantsMode } from "@tsjam/constants";
import {
  AppliedBlock,
  ChainManager,
  JamBlockExtrinsicsImpl,
  JamBlockImpl,
  JamStateImpl,
} from "@tsjam/core";
import { StateRootHash } from "@tsjam/types";
import "@tsjam/utils";
import { err, ok, Result } from "neverthrow";
import fs from "node:fs";
import net from "node:net";
import { parseArgs } from "node:util";
import { Message, MessageCodec, MessageType } from "./proto/message";
import { PeerInfo } from "./proto/peer-info";
import { State } from "./proto/state";

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
  let chainManager: ChainManager;
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

      case MessageType.INITIALIZE: {
        const stateMap = message.initialize!.state.value;
        const state = JamStateImpl.fromMerkleMap(stateMap);
        const gen = <AppliedBlock>new JamBlockImpl({
          header: message.initialize!.header,
          extrinsics: JamBlockExtrinsicsImpl.newEmpty(),
          posteriorState: state,
        });
        chainManager = await ChainManager.build(gen);
        message.initialize!.ancestry.forEach((ancestryItem) => {
          gen.posteriorState.headerLookupHistory.elements.set(
            ancestryItem.slot,
            ancestryItem.headerHash,
          );
        });
        send(new Message({ stateRoot: state.merkleRoot() }));
        break;
      }
      case MessageType.IMPORT_BLOCK: {
        const [err] = (
          await chainManager.handleIncomingBlock(message.importBlock!)
        ).safeRet();

        if (err) {
          console.log(err);
          send(new Message({ error: err }));
          break;
        } else {
          send(
            new Message({
              stateRoot: chainManager.bestBlock!.posteriorState.merkleRoot(),
            }),
          );
        }
        break;
      }
      case MessageType.GET_STATE: {
        let block = await chainManager.blocksDB.fromHeaderHash(
          message.getState!.headerHash,
        );
        if (typeof block === "undefined") {
          // try with best block
          if (
            Buffer.compare(
              chainManager.bestBlock.header.signedHash(),
              message.getState!.headerHash,
            ) === 0
          ) {
            block = chainManager.bestBlock;
          } else {
            throw new Error(
              "State not found for header hash: " +
                xBytesCodec(32).toJSON(message.getState!.headerHash),
            );
          }
        }

        send(
          new Message({
            state: new State({ value: block.posteriorState.merkle.map }),
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
