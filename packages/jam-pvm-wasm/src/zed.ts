/**
 * Z(n, a) = a if a &lt; 2^(8n-1) else a - 2^(8n)
 * @param n - the number of bytes
 * @param a - the number to convert
 * $(0.7.1 - A.10)
 */
export function Z(n: u8, a: u64): i64 {
  switch (n) {
    case 0:
      return 0;
    case 1:
      return i8(a);
    case 2:
      return i16(a);
    case 4:
      return i32(a);
    case 8:
      return i64(a);
    default:
      // support graypaper
      const limit = u64(1) << (8 * n - 1);
      if (a >= limit) {
        return i64(a - limit * 2);
      }
      return a;
  }
}

/**
 * Z_inv(n, a) = (2^(8n) + a) mod 2^(8n)
 * @param n - the number of bytes
 * @param a - the number to convert
 * $(0.7.1 - A.11)
 */
export function Z_inv(n: u8, a: i64): u64 {
  switch (n) {
    case 0:
      return 0;
    case 1:
      return u8(a);
    case 2:
      return u16(a);
    case 4:
      return u32(a);
    case 8:
      return u64(a);
    default: {
      return (u64((u64(1) << (8 * n)) + a) % (u64(1) << (8 * n))) as u64;
    }
  }
}
