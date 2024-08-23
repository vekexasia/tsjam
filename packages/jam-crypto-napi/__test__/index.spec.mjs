import test from 'ava'

import { sum,vrfoutput } from '../index.js'

test('sum from native', (t) => {
  const eta0 = Buffer.from('03170a2e7597b7b7e3d84c05391d139a62b157e78786d8c082f29dcf4c111314', 'hex');
  const hv = Buffer.from('8c2e6d327dfaa6ff8195513810496949210ad20a96e2b0672a3e1b9335080801', 'hex');
  console.log(eta0.length)
  const r = vrfoutput(new Uint8Array([...eta0]));
  console.log(r);

  //vrfoutput(new Uint8Array(new Array(64).fill(0)));
})
