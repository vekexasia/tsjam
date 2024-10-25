import { createSequenceCodec } from "@/sequenceCodec.js";
import { AUTHQUEUE_MAX_SIZE, CORES } from "@tsjam/constants";
import { HashCodec } from "@/identity";
import { JamCodec } from "@/codec";
import { AuthorizerQueue } from "@tsjam/types";

export const AuthorizerQueueCodec: JamCodec<AuthorizerQueue> =
  createSequenceCodec(
    CORES,
    createSequenceCodec(AUTHQUEUE_MAX_SIZE, HashCodec),
  );
