import test from 'ava'

import { sum,vrfoutput,ringRoot} from '../index.js'

test("ringroot", (t) => {
  const bandersnatchKeys = [
    "0x5e465beb01dbafe160ce8216047f2155dd0569f058afd52dcea601025a8d161d",
    "0x3d5e5a51aab2b048f8686ecd79712a80e3265a114cc73f14bdb2a59233fb66d0",
    "0xaa2b95f7572875b0d0f186552ae745ba8222fc0b5bd456554bfe51c68938f8bc",
    "0x7f6190116d118d643a98878e294ccf62b509e214299931aad8ff9764181a4e33",
    "0x48e5fcdce10e0b64ec4eebd0d9211c7bac2f27ce54bca6f7776ff6fee86ab3e3",
    "0xf16e5352840afb47e206b5c89f560f2611835855cf2e6ebad1acc9520a72591d"
  ]

  const buf = Buffer.alloc(bandersnatchKeys.length * 32);
  for (let i = 0; i < bandersnatchKeys.length; i++) {
      const key = Buffer.from(bandersnatchKeys[i].slice(2), "hex");
      key.copy(buf, i * 32);
  }
  const x = (ringRoot(buf));
  t.is(x.toString('hex'), '96a4b479612d8d2770d6a4785fa2f44e0befca6f008b176de51e309e2ee796d2b596e315fcb044495b75c3cb5c7fd4cdae0959758cac93d4ab8789c6aec4ba8f683c6b103cf6888f70edfcb8dcbbc1d85a8fa3832e0cd4503c7a1796c8d0c3f792e630ae2b14e758ab0960e372172203f4c9a41777dadd529971d7ab9d23ab29fe0e9c85ec450505dde7f5ac038274cf');
  // ringRoot()
});