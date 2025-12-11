import { Zp, Zz } from "@tsjam/constants";

// $(0.7.1 - A.40)
export const P_Fn = (x: number | bigint) => {
  return Zp * Math.ceil(Number(x) / Zp);
};

// $(0.7.1 - A.40)
export const Z_Fn = (x: number | bigint) => {
  return Zz * Math.ceil(Number(x) / Zz);
};
