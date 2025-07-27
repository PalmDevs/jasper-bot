import { beforeEach, mock } from 'bun:test'
import { getChannel } from '~/utils/channels'
import { getMember } from '~/utils/guilds'
import { getMessageReference } from '~/utils/messages'
import { createMockMessage, MockBot, MockChannel, MockCommandInteraction, MockMember } from './mocks'

export function setupModuleMocks() {
    mock.module('~/context', () => ({
        bot: MockBot,
        log: console,
    }))

    mock.module('oceanic.js', () => ({
        CommandInteraction: MockCommandInteraction,
    }))
}

export function setupBeforeEach() {
    beforeEach(() => {
        // Reset all mocks before each test
        mock(getMember).mockReset()
        mock(getChannel).mockReset()
        mock(getMessageReference).mockReset()

        // Set up default implementations
        mock(getMember).mockImplementation(() => Promise.resolve(MockMember))
        mock(getChannel).mockImplementation(() => Promise.resolve(MockChannel))
        mock(getMessageReference).mockImplementation(() => Promise.resolve(createMockMessage()))
    })
}
