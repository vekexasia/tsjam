import { PVMExitReason } from "./exit-reason";
import { PVM } from "./pvm";
import { MemoryAccess, Page, PVMMemory } from "./pvm-memory";
export { MemoryAccess };

export function pvm_memory(
  pages: Page[],
  acls: MemoryAccess[],
  contents: Uint8Array[],
  heapStart: u32,
  heapEnd: u32,
  heapPointer: u32,
): PVMMemory {
  const acl = new Map<Page, MemoryAccess>();
  const content = new Map<Page, Uint8Array>();
  for (let i = 0; i < pages.length; i++) {
    acl.set(pages[i], acls[i]);
    content.set(pages[i], contents[i]);
  }
  return new PVMMemory(acl, content, heapStart, heapEnd, heapPointer);
}
export function pvm_init(
  registers: StaticArray<u64>,
  memory: PVMMemory,
  gas: u64,
  pc: u32,
  code: Uint8Array,
  jumpTable: StaticArray<u32>,
  instructionMask: StaticArray<u8>,
): PVM {
  return new PVM(registers, memory, gas, pc, code, jumpTable, instructionMask);
}

export function pvm_run(pvm: PVM): PVMExitReason {
  return pvm.run();
}

export function pvm_read_reg(pvmPtr: PVM): StaticArray<u64> {
  return pvmPtr.registers;
}

export function pvm_write_reg(pvmPtr: PVM, regIndex: u8, value: u64): void {
  pvmPtr.registers[regIndex] = value;
}

export function pvm_read_gas(pvm: PVM): u64 {
  return pvm.gas;
}

export function pvm_write_gas(pvm: PVM, gas: u64): void {
  pvm.gas = gas;
}

export function pvm_read_pc(pvm: PVM): u32 {
  return pvm.pc;
}

export function pvm_write_pc(pvm: PVM, pc: u32): void {
  pvm.pc = pc;
}

export function pvm_read_fault_address(pvm: PVM): u32 {
  return pvm.faultAddress;
}

// NOTE: do we need this?
export function pvm_write_fault_address(pvm: PVM, addr: u32): void {
  pvm.faultAddress = addr;
}

export function pvm_read_host_call(pvm: PVM): u8 {
  return pvm.hostCall;
}

export function pvm_memory_canread(pvm: PVM, address: u32, length: u32): bool {
  return pvm.memory.canRead(address, length);
}

// destination length must be the desired read length
export function pvm_memory_read(pvm: PVM, address: u32, length: u32): u32 {
  const buf = new ArrayBuffer(length);
  const b = Uint8Array.wrap(buf);
  pvm.memory.readInto(address, b);
  return changetype<u32>(buf);
}

export function pvm_memory_canwrite(pvm: PVM, address: u32, length: u32): bool {
  return pvm.memory.canWrite(address, length);
}

export function pvm_deinit(pvm: PVM): void {
  pvm.memory.deinit();
  pvm.deinit();
  return;
}

export function pvm_memory_write(
  pvm: PVM,
  address: u32,
  source: Uint8Array,
): u32 {
  return pvm.memory.writeAt(address, source);
}
