import { u32, u8 } from "@/generic-types";

export interface PVMProgram {
  /**
   * Dynamic jump table.
   */
  j: u32[];
  /**
   * Number of bytes to read for each jump table entry.
   * useful when encoding/decoding the program as every entry in `j` is of the same length
   * @see j
   */
  z: u8;
  /**
   * instruction data
   */
  c: Uint8Array;
  /**
   * instruction mask
   * A bit array of length c.length a bit set to `1` at index `i` meanc that `c[i]` is an opcode instruction
   * @see c
   */
  k: Array<0 | 1>;
}
