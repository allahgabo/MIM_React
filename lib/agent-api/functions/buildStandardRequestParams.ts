
import { AgentMessage } from "../types";

export interface AgentRequestBuildParams {
    authToken: string;
    messages: AgentMessage[];
    input?: string;
    experimental?: Record<string, unknown>;
    tools?: (Record<string, unknown>)[];
    toolResources?: Record<string, unknown>;
}

/**
 * This is a good starting point for building a request to the agent API.
 * You can modify the request body to your needs
 */
export function buildStandardRequestParams(params: AgentRequestBuildParams) {
    const {
        authToken,
        messages,
        experimental,
        tools,
        toolResources,
    } = params;

    const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Snowflake-Authorization-Token-Type': 'KEYPAIR_JWT',
        'Authorization': `Bearer ${authToken}`,
    }

    const body = {
        "model": "claude-4-sonnet",
        "experimental": experimental,
        "messages": messages,
        "tools": tools,
        "tool_resources": toolResources,
    }

    return { headers, body };
}