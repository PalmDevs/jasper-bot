import type { ai } from '~/context'

export type MessageData = Awaited<ReturnType<(typeof ai)['generate']>>['messages']
export type MessageDataEntry = MessageData[number]
