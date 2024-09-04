import { E, E_1, JamCodec } from "@vekexasia/jam-codec";
import { PVMProgram, u32, u8 } from "@vekexasia/jam-types";

export const PVMProgramCodec: JamCodec<PVMProgram> = {
  encode(value: PVMProgram, bytes: Uint8Array): number {
    if (value.k.length !== value.c.length) {
      throw new Error("k and c must have the same length");
    }
    let offset = 0;
    offset += E.encode(BigInt(value.j.length), bytes.subarray(offset));
    // E_1(z)
    offset += E_1.encode(BigInt(value.z), bytes.subarray(offset, offset + 1));

    // E(|c|)
    offset += E.encode(BigInt(value.c.length), bytes.subarray(offset));
    // E_z(j)
    for (let i = 0; i < value.j.length; i++) {
      offset += E.encode(
        BigInt(value.j[i]),
        bytes.subarray(offset, offset + value.z),
      );
    }

    // E(c)
    bytes.set(value.c, offset);
    offset += value.c.length;

    // E(k)
    bytes.set(
      value.k.reduce<number[]>((acc, k, index) => {
        if (index % 8 === 0) {
          // init the new byte to 0
          acc.push(0);
        }
        acc[acc.length - 1] |= k << (7 - (index % 8));
        return acc;
      }, []),
      offset,
    );
    offset += Math.ceil(value.k.length / 8);
    return offset;
  },
  decode(bytes: Uint8Array): { value: PVMProgram; readBytes: number } {
    let offset = 0;
    const obj: PVMProgram = {} as PVMProgram;

    const jCard = E.decode(bytes.subarray(offset));
    offset += jCard.readBytes;

    // E_1(z)
    const z = E_1.decode(bytes.subarray(offset, offset + 1));
    offset += z.readBytes;
    obj.z = Number(z.value) as u8;

    // E(|c|)
    const cCard = E.decode(bytes.subarray(offset));
    offset += cCard.readBytes;

    // E_z(j)
    obj.j = [];
    for (let i = 0; i < jCard.value; i++) {
      const item = E.decode(bytes.subarray(offset, offset + obj.z));
      obj.j.push(Number(item.value) as u32);
      offset += item.readBytes; // should be z
    }

    // E(c)
    obj.c = bytes.subarray(offset, offset + Number(cCard.value));
    offset += Number(cCard.value);

    // E(k)
    const elements = Math.ceil(Number(cCard.value) / 8);
    obj.k = Array.from(bytes.subarray(offset, offset + elements))
      .map((byte) => {
        const bits: Array<0 | 1> = [];
        for (let bitIndex = 7; bitIndex >= 0; bitIndex--) {
          bits.push(((byte >> bitIndex) & 1) as 0 | 1);
        }
        return bits;
      })
      .flat()
      .slice(0, Number(cCard.value));

    offset += elements;
    return { value: obj, readBytes: offset };
  },
  encodedSize(value: PVMProgram): number {
    return (
      E.encodedSize(BigInt(value.j.length)) +
      1 + // E_1(z)
      E.encodedSize(BigInt(value.c.length)) +
      value.c.length +
      value.j.length * value.z + // E_z(j)
      Math.ceil(value.k.length / 8)
    );
  },
};

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;
  describe("ProgramCodec", () => {
    it("should encode an empty program", () => {
      const p: PVMProgram = {
        j: [],
        z: 1 as u8,
        c: new Uint8Array(0),
        k: [],
      };
      const bytes = new Uint8Array(PVMProgramCodec.encodedSize(p));
      const written = PVMProgramCodec.encode(p, bytes);
      expect(written).toEqual(bytes.length);
      const decoded = PVMProgramCodec.decode(bytes);
      expect(decoded.readBytes).toEqual(bytes.length);
      expect(decoded.value).toEqual(p);
    });
    it("should encode/decode a single instruction program", () => {
      const p: PVMProgram = {
        j: [],
        z: 1 as u8,
        c: new Uint8Array([45]),
        k: [1],
      };
      const bytes = new Uint8Array(PVMProgramCodec.encodedSize(p));
      const written = PVMProgramCodec.encode(p, bytes);
      expect(written).toEqual(bytes.length);
      const decoded = PVMProgramCodec.decode(bytes);
      expect(decoded.readBytes).toEqual(bytes.length);
      expect(decoded.value).toEqual(p);
    });
    it("should error when k and c have different lengths", () => {
      const p: PVMProgram = {
        j: [],
        z: 1 as u8,
        c: new Uint8Array([45]),
        k: [1, 0],
      };
      const bytes = new Uint8Array(PVMProgramCodec.encodedSize(p));
      expect(() => PVMProgramCodec.encode(p, bytes)).toThrow(
        "k and c must have the same length",
      );
    });
  });
}
