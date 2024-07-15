import { defineWorkspace } from 'vitest/config'
import codec from './packages/jam-codec/vitest.workspace.ts'
import types from './packages/jam-types/vitest.workspace.ts'
export default defineWorkspace([
  ...types,
  ...codec,
])
