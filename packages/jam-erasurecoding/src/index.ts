import assert from "node:assert";
import { ByteArrayOfLength, SeqOfLength } from "@vekexasia/jam-types";

/**
 * Split data into k parts of n bytes each
 * @param n - chunk size
 * @param k - number of chunks
 * @param data - data to split
 * @returns array of chunks
 */
export const split = <N extends number, K extends number>(
  n: N,
  k: K,
  data: Uint8Array,
): SeqOfLength<ByteArrayOfLength<N>, K> => {
  assert(data.length === n * k, "data length must be n * k");
  const toRet = [];
  for (let i = 0; i < k; i++) {
    toRet.push(data.subarray(i * n, (i + 1) * n));
  }
  return toRet as SeqOfLength<ByteArrayOfLength<N>, K>;
};

export const join = <N extends number, K extends number>(
  n: N,
  k: K,
  data: SeqOfLength<ByteArrayOfLength<K>, N>,
): Uint8Array => {
  const toRet = new Uint8Array(n * k);
  for (let i = 0; i < k; i++) {
    toRet.set(data[i], i * n);
  }
  return toRet;
};

export const unzip = <N extends number, K extends number>(
  n: N,
  k: K,
  data: Uint8Array,
): SeqOfLength<ByteArrayOfLength<N>, K> => {
  assert(data.length === n * k, "data length must be n * k");
  const toRet = [];
  for (let i = 0; i < k; i++) {
    const arr = new Uint8Array(n);
    for (let j = 0; j < n; j++) {
      arr[j] = data[j * k + i];
    }
    toRet.push(arr);
  }
  return toRet as SeqOfLength<ByteArrayOfLength<N>, K>;
};

export const lace = <N extends number, K extends number>(
  n: N,
  k: K,
  data: SeqOfLength<ByteArrayOfLength<N>, K>,
): Uint8Array => {
  const toRet = new Uint8Array(n * k);
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < n; j++) {
      toRet[j * k + i] = data[i][j];
    }
  }
  return toRet;
};

/**
 * (317) `transpose`
 */
export const transpose = <T>(matrix: T[][]): T[][] => {
  for (let i = 0; i < matrix.length; i++) {
    if (matrix[i].length !== matrix[0].length) {
      throw new Error("all rows must have the same length");
    }
  }
  const toRet: T[][] = [];
  for (let i = 0; i < matrix.length; i++) {
    const row: T[] = [];
    for (let j = 0; j < matrix[0].length; j++) {
      row.push(matrix[j][i]);
    }
    toRet.push(row);
  }
  return toRet;
};

export const erasureCoding = (
  k: number,
  d: Uint8Array,
): SeqOfLength<Uint8Array, 1023> => {
  assert(d.length === 684 * k, "data length must be 684*k");
  throw new Error("Not implemented");
};
