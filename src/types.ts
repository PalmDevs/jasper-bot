declare global {
    type If<T, TTrue, TFalse> = T extends true ? TTrue : TFalse
    type BitFlagDictValue<T extends Record<string, number>> = T[keyof T] | number
}
