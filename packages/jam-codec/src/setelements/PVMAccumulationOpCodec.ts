import { PVMAccumulationOp } from "@tsjam/types";
import { HashCodec, WorkPackageHashCodec } from "@/identity.js";
import { WorkOutputCodec } from "@/setelements/WorkOutputCodec.js";
import { LengthDiscrimantedIdentity } from "@/lengthdiscriminated/lengthDiscriminator.js";
import { createCodec } from "@/utils";

/**
 * $(0.6.4 - C.29)
 */
export const PVMAccumulationOpCodec = createCodec<PVMAccumulationOp>([
  ["workPackageHash", WorkPackageHashCodec],
  ["segmentRoot", HashCodec],
  ["authorizerHash", HashCodec],
  ["authorizerOutput", LengthDiscrimantedIdentity],
  ["payloadHash", HashCodec],
  ["output", WorkOutputCodec],
]);
