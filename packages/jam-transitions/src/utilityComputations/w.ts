import { EG_Extrinsic } from "@tsjam/types";

// (141)
export const _w = (eg_ex: EG_Extrinsic) =>
  eg_ex.map(({ workReport }) => workReport);
