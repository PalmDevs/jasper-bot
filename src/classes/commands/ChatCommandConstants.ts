export enum ChatCommandOptionTypes {
    MESSAGE = 100,
}
export const ChatCommandOptionsWithReadMessageReferenceMode = {
    /**
     * Only use the message reference if no argument was provided.
     */
    Fallback: 1,
    /**
     * Prioritize the message reference.
     *
     * If there is a message reference, it will be used to get the user, passing the current argument to the next option.
     * If there is no message reference, the current argument will be used.
     */
    Prioritize: 2,
} as const
