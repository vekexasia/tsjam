import {
  E_2,
  E_4,
  E_8,
  HashCodec,
  JamCodec,
  LengthDiscrimantedIdentity,
  createArrayLengthDiscriminator,
} from "@vekexasia/jam-codec";
import { WorkItem, u32 } from "@vekexasia/jam-types";

const xxCodec = createArrayLengthDiscriminator<
  WorkItem["exportedDataSegments"][0]
>({
  encode(
    value: WorkItem["exportedDataSegments"][0],
    bytes: Uint8Array,
  ): number {
    let offset = HashCodec.encode(value.blobHash, bytes);
    offset += E_4.encode(
      BigInt(value.length),
      bytes.subarray(offset, offset + 4),
    );
    return offset;
  },
  decode(bytes: Uint8Array): {
    value: WorkItem["exportedDataSegments"][0];
    readBytes: number;
  } {
    let offset = 0;
    const blobHash = HashCodec.decode(
      bytes.subarray(offset, offset + 32),
    ).value;
    offset += 32;
    const index = Number(E_4.decode(bytes.subarray(offset, offset + 4)).value);
    offset += 4;
    return {
      value: { blobHash, length: index as u32 },
      readBytes: offset,
    };
  },
  encodedSize(): number {
    return 32 + 4;
  },
});
const xiCodec = createArrayLengthDiscriminator<
  WorkItem["importedDataSegments"][0]
>({
  encode(
    value: WorkItem["importedDataSegments"][0],
    bytes: Uint8Array,
  ): number {
    let offset = HashCodec.encode(value.root, bytes);
    offset += E_2.encode(
      BigInt(value.index),
      bytes.subarray(offset, offset + 2),
    );
    return offset;
  },
  decode(bytes: Uint8Array): {
    value: WorkItem["importedDataSegments"][0];
    readBytes: number;
  } {
    let offset = 0;
    const root = HashCodec.decode(bytes.subarray(offset, offset + 32)).value;
    offset += 32;
    const index = Number(E_2.decode(bytes.subarray(offset, offset + 2)).value);
    offset += 2;
    return {
      value: { root, index: index as u32 },
      readBytes: offset,
    };
  },
  encodedSize(): number {
    return 32 + 2;
  },
});
/**
 * @see Appendix C formula (288)
 */
export const WorkItemCodec: JamCodec<WorkItem> = {
  encode(value: WorkItem, bytes: Uint8Array): number {
    let offset = E_4.encode(BigInt(value.serviceIndex), bytes);
    offset += HashCodec.encode(value.codeHash, bytes.subarray(offset));
    offset += LengthDiscrimantedIdentity.encode(
      value.payload,
      bytes.subarray(offset),
    );
    offset += E_8.encode(BigInt(value.gasLimit), bytes.subarray(offset));
    offset += xiCodec.encode(
      value.importedDataSegments,
      bytes.subarray(offset),
    );
    offset += xxCodec.encode(
      value.exportedDataSegments,
      bytes.subarray(offset),
    );

    offset += E_2.encode(
      BigInt(value.numberExportedSegments),
      bytes.subarray(offset),
    );
    return offset;
  },
  decode(bytes: Uint8Array): { value: WorkItem; readBytes: number } {
    let offset = 0;
    const serviceIndex = Number(E_4.decode(bytes.subarray(offset)).value);
    offset += 4;
    const codeHash = HashCodec.decode(bytes.subarray(offset)).value;
    offset += 32;
    const payload = LengthDiscrimantedIdentity.decode(
      bytes.subarray(offset),
    ).value;
    offset += payload.length;
    const gasLimit = E_8.decode(bytes.subarray(offset)).value;
    offset += 8;
    const importedDataSegments = xiCodec.decode(bytes.subarray(offset))
      .value as WorkItem["importedDataSegments"];
    offset += xiCodec.encodedSize(importedDataSegments);
    const exportedDataSegments = xxCodec.decode(bytes.subarray(offset)).value;
    offset += xxCodec.encodedSize(exportedDataSegments);
    const numberExportedSegments = Number(
      E_2.decode(bytes.subarray(offset)).value,
    ) as u32;
    offset += 2;
    return {
      value: {
        serviceIndex: serviceIndex as WorkItem["serviceIndex"],
        codeHash,
        payload,
        gasLimit: gasLimit as WorkItem["gasLimit"],
        importedDataSegments,
        exportedDataSegments,
        numberExportedSegments,
      },
      readBytes: offset,
    };
  },
  encodedSize(value: WorkItem): number {
    return (
      4 +
      32 +
      value.payload.length +
      8 +
      xiCodec.encodedSize(value.importedDataSegments) +
      xxCodec.encodedSize(value.exportedDataSegments) +
      2
    );
  },
};
