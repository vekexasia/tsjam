import { PVMAccumulationOp } from "@tsjam/types";
import { HashCodec } from "@/identity.js";
import { WorkOutputCodec } from "@/setelements/WorkOutputCodec.js";
import { LengthDiscrimantedIdentity } from "@/lengthdiscriminated/lengthDiscriminator.js";
import { createCodec } from "@/utils";

export const PVMAccumulationOpCodec = createCodec<PVMAccumulationOp>([
  ["output", WorkOutputCodec],
  ["payloadHash", HashCodec],
  ["packageHash", HashCodec],
  ["authorizationOutput", LengthDiscrimantedIdentity],
]);
