import { BaseMemory, PVM, PVMImplementation } from "@tsjam/pvm-base";
import { pvmImplementation } from "@tsjam/pvm-js";

export const pvmImpl: PVMImplementation<PVM, BaseMemory> = pvmImplementation;
