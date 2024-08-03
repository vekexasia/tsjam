import { u8 } from "@vekexasia/jam-types";
import { GenericPVMInstruction } from "@/instructions/genericInstruction.js";

export const Ixdb = {
  byCode: new Map<u8, GenericPVMInstruction<unknown[]>>(),
  byIdentifier: new Map<string, GenericPVMInstruction<unknown[]>>(),
  blockTerminators: new Set<u8>(),
};
/**
 * register an instruction in the instruction database
 * @param conf - the configuration object
 */
export const regIx = <T extends unknown[]>(conf: {
  /**
   * the identifier of the instruction
   */
  opCode: u8;
  /**
   * the human readable name of the instruction
   */
  identifier: string;
  /**
   * whether the instruction is a block terminator
   * @remarks see Appendix A.3
   */
  blockTermination?: true;

  ix: GenericPVMInstruction<T>;
}): GenericPVMInstruction<T> => {
  Ixdb.byCode.set(conf.opCode, conf.ix);
  Ixdb.byIdentifier.set(conf.identifier, conf.ix);
  if (conf.blockTermination) {
    Ixdb.blockTerminators.add(conf.opCode);
  }
  return conf.ix;
};
