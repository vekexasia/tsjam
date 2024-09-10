import { EG_Extrinsic } from "@vekexasia/jam-types";

// (141)
export const _w = (eg_ex: EG_Extrinsic) =>
  eg_ex.map(({ workReport }) => workReport);
