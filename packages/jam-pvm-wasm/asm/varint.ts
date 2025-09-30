export function x_fn(n: u8, x: u64): u64 {
  if (n === 0) {
    return x;
  }
  const mul = u64(-1 * 2 ** (8 * n));
  //console.log(`n=${n}, x=${x}, mul=${mul}`);
  return x + u64(x / 2 ** (8 * n - 1)) * mul;
}

export function readLE(buf: Uint8Array, length: u8): u64 {
  switch (length) {
    case 0:
      return 0;
    case 1:
      return u64(buf[0]);
    case 2:
      return load<u16>(buf.dataStart);
    case 4:
      return load<u32>(buf.dataStart);
    case 8:
      return load<u64>(buf.dataStart);
    default:
      let result: u64 = 0;
      for (let i: u8 = 0; i < length; i++) {
        result |= u64(buf[i]) << (8 * i);
      }
      return result;
  }
}

export function varint(buf: Uint8Array): u64 {
  const length = u8(buf.length);
  const data: u64 = readLE(buf, length);
  return x_fn(length, data);
}
