import { Delta, Hash, ServiceIndex, u32 } from "@tsjam/types";
import { toTagged } from "@tsjam/utils";

/**
 * $(0.7.0 - 12.41)
 */
export const preimageSolicitedButNotYetProvided = (
  serviceAccounts: Delta,
  serviceIndex: ServiceIndex,
  hash: Hash,
  length: number,
): boolean => {
  const sa = serviceAccounts.get(serviceIndex)!;
  return (
    !sa.preimages.has(hash) &&
    (sa.requests.get(hash)?.get(toTagged(<u32>length))?.length ?? 0) !== 0
  );
};
