import { AgentMessage, AgentMessageRole } from "../../types";

/**
 * Appends an user message to the messages list.
 * The user message is always appended after the last assistant message.
 * If there are existing user messages after the last assistant message, they are replaced.
 */
export function appendUserMessageToMessagesList(userMessage: AgentMessage) {
    return (prevMessages: AgentMessage[]) => {
        const lastAssistantMessageIndex = prevMessages.findLastIndex(
            (message) => message.role === AgentMessageRole.ASSISTANT,
        )

        const newMessage = structuredClone(userMessage);
        return [...prevMessages.slice(0, lastAssistantMessageIndex + 1), newMessage];
    }
}