import { SimHash } from '@counterrealist/simhash'

export const SimHashNgramSize = 16

export const simHash = new SimHash({
    ngramSize: SimHashNgramSize,
})
