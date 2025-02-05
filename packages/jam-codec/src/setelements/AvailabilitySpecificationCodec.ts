import { AvailabilitySpecification, WorkPackageHash, u16 } from "@tsjam/types";
import { JamCodec } from "@/codec.js";
import { HashCodec } from "@/identity.js";
import { E_sub_int } from "@/ints/E_subscr.js";
import { createCodec } from "@/utils";

/**
 *
 * `S` set member codec
 * $(0.6.1 - C.22)
 */
export const AvailabilitySpecificationCodec =
  createCodec<AvailabilitySpecification>([
    ["workPackageHash", HashCodec as unknown as JamCodec<WorkPackageHash>],
    ["bundleLength", E_sub_int<AvailabilitySpecification["bundleLength"]>(4)],
    ["erasureRoot", HashCodec],
    ["segmentRoot", HashCodec],
    ["segmentCount", E_sub_int<u16>(2)],
  ]);
