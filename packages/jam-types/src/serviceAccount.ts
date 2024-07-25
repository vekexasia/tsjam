/**
 * The analogous to a Smart Contract in ETH.
 *
 */
export interface ServiceAccount {
  // should be a Dictionary in the form of Hash => Uint8Array
  storage: unknown;
  // preimage lookup dictionaries in the form of Hash => Uint8Array
  preimage_p: unknown;
  // preimage lookup dictionaries
  preimage_l: unknown;
  // c code hash
  codeHash: unknown;
  // balance
  balance: bigint;
  // minimum gas for the accumulate method
  minGasAccumulate: bigint;
  // minimum gas for the on_transfer method
  minGasOnTransfer: bigint;
}
