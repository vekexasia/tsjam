import {
  ED25519PublicKey,
  HeaderHash,
  JamHeader,
  StateRootHash,
  Tau,
  ValidatorIndex,
} from "@tsjam/types";
import { Optional } from "@/optional.js";
import {
  BandersnatchCodec,
  BandersnatchSignatureCodec,
  Blake2bHashCodec,
  create32BCodec,
  Ed25519PubkeyCodec,
  HashCodec,
} from "@/identity.js";
import { createArrayLengthDiscriminator } from "@/lengthdiscriminated/arrayLengthDiscriminator.js";
import { TicketIdentifierCodec } from "@/ticketIdentifierCodec.js";
import { createSequenceCodec } from "@/sequenceCodec.js";
import { E_sub_int } from "@/ints/E_subscr.js";
import { EPOCH_LENGTH, NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import { createCodec } from "@/utils";

/**
 * `Eu` codec
 * $(0.6.4 - C.20)
 */
export const UnsignedHeaderCodec = (
  validators: typeof NUMBER_OF_VALIDATORS = NUMBER_OF_VALIDATORS,
  epochLength: typeof EPOCH_LENGTH = EPOCH_LENGTH,
) =>
  createCodec<JamHeader>([
    ["parent", create32BCodec<HeaderHash>()],
    ["priorStateRoot", create32BCodec<StateRootHash>()],
    ["extrinsicHash", HashCodec],
    ["timeSlotIndex", E_sub_int<Tau>(4)],
    [
      "epochMarker",
      new Optional(
        createCodec<NonNullable<JamHeader["epochMarker"]>>([
          ["entropy", Blake2bHashCodec],
          ["entropy2", Blake2bHashCodec],
          [
            "validatorKeys",
            createSequenceCodec<
              NonNullable<JamHeader["epochMarker"]>["validatorKeys"]
            >(
              validators,
              createCodec([
                ["bandersnatch", BandersnatchCodec],
                ["ed25519", Ed25519PubkeyCodec],
              ]),
            ),
          ],
        ]),
      ),
    ],
    [
      "winningTickets",
      new Optional(createSequenceCodec(epochLength, TicketIdentifierCodec)),
    ],
    [
      "offenders",
      createArrayLengthDiscriminator({
        ...Ed25519PubkeyCodec,
        encode(value: ED25519PublicKey, bytes: Uint8Array): number {
          return Ed25519PubkeyCodec.encode(value, bytes.subarray(0, 32));
        },
        decode(bytes: Uint8Array) {
          return Ed25519PubkeyCodec.decode(bytes.subarray(0, 32));
        },
      }),
    ],
    ["blockAuthorKeyIndex", E_sub_int<ValidatorIndex>(2)],
    ["entropySignature", BandersnatchSignatureCodec],
  ]);
