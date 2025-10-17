import {
  BaseJamCodecable,
  E_int,
  JamCodecable,
  codec,
  eSubIntCodec,
  encodeWithCodec,
  xBytesCodec,
} from "@tsjam/codec";
import { ChainManager, MerkleStateTrieNode } from "@tsjam/core";
import type { HeaderHash, StateKey, u32 } from "@tsjam/types";

import "neverthrow-safe-ret";
/**
 * CE 129
 */
@JamCodecable()
export class StateRequest extends BaseJamCodecable {
  @codec(xBytesCodec(32), "header_hash")
  headerHash!: HeaderHash;

  @codec(xBytesCodec(31), "start_key")
  startKey!: StateKey;

  @codec(xBytesCodec(31), "end_key")
  endKey!: StateKey;

  @eSubIntCodec(4)
  maxSize!: u32;

  async produceReply(manager: ChainManager) {
    const [err, state] = (await manager.getStateFor(this.headerHash)).safeRet();

    if (typeof err === "string") {
      throw new Error(
        `Could not get state for ${this.headerHash.toString("hex")}: ${err}`,
      );
    }
    const startValue = state.map.get(this.startKey) || Buffer.alloc(0);
    const endValue = state.map.get(this.endKey) || Buffer.alloc(0);
    const startLeaf = MerkleStateTrieNode.leaf(this.startKey, startValue);
    const endLeaf = MerkleStateTrieNode.leaf(this.endKey, endValue);

    // find path to start key
    const pathToStart = state.trie
      .traverseTo(startLeaf.identifier)
      .map((a) => a.identifier);
    const pathToEnd = state.trie
      .traverseTo(endLeaf.identifier)
      .map((a) => a.identifier);

    // compute boundary nodes without duplicates
    const boundaryNodes: Buffer[] = [];
    pathToStart.forEach((nodeId) => boundaryNodes.push(nodeId));

    // check for end which ones are not included
    for (const nodeId of pathToEnd) {
      if (!boundaryNodes.find((a) => Buffer.compare(a, nodeId) !== 0)) {
        boundaryNodes.push(nodeId);
      }
    }

    const allMatchingLeaves = state.trie.leaves!.filter(
      (a) =>
        Buffer.compare(this.startKey, a.key) <= 0 &&
        Buffer.compare(this.endKey, a.key) > 0,
    );

    const encodedKeyValues: Buffer[] = [];
    let remainingSize = Math.max(1, this.maxSize - boundaryNodes.length * 64);
    for (let i = 0; i < allMatchingLeaves.length && remainingSize > 0; i++) {
      const leaf = allMatchingLeaves[i];
      encodedKeyValues.push(
        Buffer.concat([
          leaf.key,
          encodeWithCodec(E_int(), leaf.value.length),
          leaf.value,
        ]),
      );
      remainingSize += encodedKeyValues[encodedKeyValues.length - 1].length;
    }

    if (remainingSize < 0 && encodedKeyValues.length > 1) {
      encodedKeyValues.pop(); // remove last
    }

    return Buffer.concat([...boundaryNodes, ...encodedKeyValues]);
  }
}
