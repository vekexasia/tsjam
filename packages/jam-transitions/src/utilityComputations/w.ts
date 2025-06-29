import { EG_Extrinsic } from "@tsjam/types";

// $(0.7.0 - 11.28)
// Computes the sequence of workreports in the extrinsic
export const _I = (eg_ex: EG_Extrinsic) =>
  eg_ex.map(({ workReport }) => workReport);
