import { JamCodec } from "@/codec.js";

export * from "@/ints/e.js";
export * from "@/ints/e4star.js";
export * from "@/ints/E_subscr.js";
export * from "@/validatorDataCodec.js";
export * from "@/bitSequence.js";
export * from "@/optional.js";
export * from "@/lengthdiscriminated/arrayLengthDiscriminator.js";
export * from "@/lengthdiscriminated/lengthDiscriminator.js";
export * from "@/lengthdiscriminated/utils.js";
export type { JamCodec } from "@/codec.js";
export * from "@/sequenceCodec.js";
export * from "@/identity.js";

export * from "@/extrinsics/assurances.js";
export * from "@/extrinsics/disputes.js";
export * from "@/extrinsics/guarantees.js";
export * from "@/extrinsics/preimages.js";
export * from "@/extrinsics/tickets.js";

export * from "@/setelements/AvailabilitySpecificationCodec.js";
export * from "@/setelements/PVMAccumulationOpCodec.js";
export * from "@/setelements/RefinementContextCodec.js";
export * from "@/setelements/TicketCodec.js";
export * from "@/setelements/WorkItemCodec.js";
export * from "@/setelements/WorkPackageCodec.js";
export * from "@/setelements/WorkReportCodec.js";
export * from "@/setelements/WorkResultCodec.js";

export * from "./block/header/unsigned.js";
export * from "./block/header/signed.js";
export * from "./block/block.js";
export * from "./PVMProgramCodec.js";





/**
 * encode with codec a value by also creating the buffer
 * @param codec - the codec to use
 * @param value - the value to encode
 */
export const encodeWithCodec = <T>(
  codec: JamCodec<T>,
  value: T,
): Uint8Array => {
  const buffer = new Uint8Array(codec.encodedSize(value));
  codec.encode(value, buffer);
  return buffer;
};
