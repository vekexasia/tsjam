import { EG_Extrinsic } from "@tsjam/types";

// $(0.6.4 - 11.28)
export const _w = (eg_ex: EG_Extrinsic) =>
  eg_ex.map(({ workReport }) => workReport);
