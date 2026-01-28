import { AgentMessage, AgentMessageRole } from "../../types";

/**
 * Returns an SQL execution user message.
 */
export function getSQLExecUserMessage(latestId: string, query_id: string): AgentMessage {
    return {
        id: latestId,
        role: AgentMessageRole.USER,
        content: [{
            type: "tool_results",
            tool_results: {
                name: "sql_exec",
                content: [{
                    type: "json",
                    json: { query_id: query_id}
                }]
            }
        }],
    }
}