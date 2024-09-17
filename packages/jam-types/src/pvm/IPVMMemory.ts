/**
 * Interface middleware for the RAM of the PVM
 * implementors should take care of the memory access
 */
export interface IPVMMemory {
  /**
   * @throws in case there is an issue accessing the memory
   * @param offset - offset to write the value to
   * @param bytes - the value to write
   */
  setBytes(offset: number, bytes: Uint8Array): void;
  /**
   * @throws in case there is an issue accessing the memory
   * @param offset - the offset to write the value to
   * @param length - the length of the bytes to read
   */
  getBytes(offset: number, length: number): Uint8Array;

  canRead(offset: number, length: number): boolean;
  canWrite(offset: number, length: number): boolean;
}
