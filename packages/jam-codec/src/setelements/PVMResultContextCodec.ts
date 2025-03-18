import { JamCodec } from "@/codec";
import { HashCodec } from "@/identity";
import { E_4_int, E_sub, E_sub_int } from "@/ints/E_subscr";
import { createArrayLengthDiscriminator } from "@/lengthdiscriminated/arrayLengthDiscriminator";
import { Optional } from "@/optional";
import { createCodec, mapCodec } from "@/utils";
import {
  Delta,
  Gas,
  PrivilegedServices,
  PVMAccumulationState,
  PVMResultContext,
  ServiceIndex,
} from "@tsjam/types";
import { DeferredTransferCodec } from "./DeferredTransferCodec";
import { AuthorizerQueueCodec } from "@/state/AuthorizerQueueCodec";
import { ValidatorDataCodec } from "@/validatorDataCodec";
import {
  buildGenericKeyValueCodec,
  buildKeyValueCodec,
} from "@/dicts/keyValue";

export const DeltaCodec = createCodec<Delta>([]);
export const PVMAccumulationStateCodec = createCodec<PVMAccumulationState>([
  ["delta", DeltaCodec],
  [
    "validatorKeys",
    <JamCodec<PVMAccumulationState["validatorKeys"]>>(
      createArrayLengthDiscriminator(ValidatorDataCodec)
    ),
  ],
  ["authQueue", AuthorizerQueueCodec()],
  [
    "privServices",
    createCodec<PrivilegedServices>([
      ["bless", E_sub_int<ServiceIndex>(4)],
      ["assign", E_sub_int<ServiceIndex>(4)],
      ["designate", E_sub_int<ServiceIndex>(4)],
      [
        "alwaysAccumulate",
        buildGenericKeyValueCodec(
          E_sub_int<ServiceIndex>(4),
          E_sub<Gas>(8),
          (a, b) => a - b,
        ),
      ],
    ]),
  ],
]);
export const PVMResultContextCodec: JamCodec<PVMResultContext> = createCodec([
  ["service", E_sub_int<ServiceIndex>(4)],
  ["u", PVMAccumulationStateCodec],
  ["i", E_sub_int<ServiceIndex>(4)],
  ["y", new Optional(HashCodec)],
  ["transfer", createArrayLengthDiscriminator(DeferredTransferCodec)],
]);
