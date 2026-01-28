import { AgentMessage, AgentMessageRole } from "../../types";

/**
 * Appends an assistant message to the messages list.
 * The assistant message is always appended after the last user message.
 * If there are existing assistant messages after the last user message, they are replaced.
 */
export function appendAssistantMessageToMessagesList(assistantMessage: AgentMessage) {
    return (prevMessages: AgentMessage[]) => {
        const lastUserMessageIndex = prevMessages.findLastIndex(
            (message) => message.role === AgentMessageRole.USER,
        )

        const newMessage = structuredClone(assistantMessage);
        return [...prevMessages.slice(0, lastUserMessageIndex + 1), newMessage];
    }
}