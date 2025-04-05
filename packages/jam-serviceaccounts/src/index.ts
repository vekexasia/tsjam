import {
  SERVICE_ADDITIONAL_BALANCE_PER_ITEM,
  SERVICE_ADDITIONAL_BALANCE_PER_OCTET,
  SERVICE_MIN_BALANCE,
} from "@tsjam/constants";
import { Gas, ServiceAccount, u32, u64 } from "@tsjam/types";
import { toTagged } from "@tsjam/utils";
import {
  createCodec,
  IdentityCodec,
  LengthDiscrimantedIdentity,
} from "@tsjam/codec";

export const serviceMetadataCodec = createCodec<{
  code: Uint8Array;
  metadata: Uint8Array;
}>([
  ["metadata", LengthDiscrimantedIdentity],
  ["code", IdentityCodec],
]);
/**
 *
 * computes bold_c and bold_m
 * $(0.6.4 - 9.4)
 */
export const serviceAccountMetadataAndCode = (a: ServiceAccount) => {
  const blob = a.preimage_p.get(a.codeHash);
  if (typeof blob === "undefined") {
    return { code: undefined, metadata: undefined };
  }
  const decoded = serviceMetadataCodec.decode(blob);
  return decoded.value;
};

/**
 * compute the gas threshold of a service account
 * @param a - the service account
 * $(0.6.4 - 9.8)
 */
export const serviceAccountGasThreshold = (a: ServiceAccount): Gas => {
  const ai = BigInt(serviceAccountItemInStorage(a));
  const l =
    [...a.preimage_l.values()].reduce(
      (acc, v) => acc + [...v.keys()].reduce((a, b) => a + BigInt(b) + 81n, 0n),
      0n,
    ) +
    [...a.storage.values()].reduce((a, b) => a + BigInt(b.length) + 32n, 0n);
  return <Gas>(SERVICE_MIN_BALANCE + // Bs
    SERVICE_ADDITIONAL_BALANCE_PER_ITEM * ai + // BI*ai
    SERVICE_ADDITIONAL_BALANCE_PER_OCTET * l) /* BL*al */;
};

/**
 * `a_i` - total number of preimage lookup dictionaries and
 * $(0.6.4 - 9.8)
 */
export const serviceAccountItemInStorage = (a: ServiceAccount): u32 => {
  return toTagged(2 * a.preimage_l.size + a.storage.size);
};

/**
 * `a_o` - total octets in the preimage lookup and storage
 * $(0.6.4 - 9.8)
 */
export const serviceAccountTotalOctets = (a: ServiceAccount): u64 => {
  let sum: bigint = 0n;

  for (const zmap of a.preimage_l.values()) {
    for (const length of zmap.keys()) {
      sum += BigInt(length) + 81n;
    }
  }
  for (const d of a.storage.values()) {
    sum += BigInt(d.length) + 32n;
  }

  return sum as u64;
};
