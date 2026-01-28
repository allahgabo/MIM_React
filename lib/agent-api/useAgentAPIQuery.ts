"use client"

import React from "react";
import { events } from 'fetch-event-stream';
import { AgentMessage, AgentMessageRole, AgentMessageToolResultsContent, AgentMessageToolUseContent } from "./types";
import { AgentRequestBuildParams, buildStandardRequestParams } from "./functions/buildStandardRequestParams";
import { appendTextToAssistantMessage } from "./functions/assistant/appendTextToAssistantMessage";
import { getEmptyAssistantMessage } from "./functions/assistant/getEmptyAssistantMessage";
import { getSQLExecUserMessage } from "./functions/assistant/getSQLExecUserMessage";
import { appendAssistantMessageToMessagesList } from "./functions/assistant/appendAssistantMessageToMessagesList";
import { appendToolResponseToAssistantMessage } from "./functions/assistant/appendToolResponseToAssistantMessage";
import { appendUserMessageToMessagesList } from "./functions/assistant/appendUserMessageToMessagesList";
import { toast } from "sonner";
import { appendFetchedTableToAssistantMessage } from "./functions/assistant/appendFetchedTableToAssistantMessage";
import { appendTableToAssistantMessage } from "./functions/assistant/appendTableToAssistantMessage";
import { appendChartToAssistantMessage } from "./functions/assistant/appendChartToAssistantMessage";
import { removeFetchedTableFromMessages } from "./functions/chat/removeFetchedTableFromMessages";
import shortUUID from "short-uuid";

export interface AgentApiQueryParams extends Omit<AgentRequestBuildParams, "messages" | "input"> {
    snowflakeUrl: string;
}

export enum AgentApiState {
    IDLE = "idle",
    LOADING = "loading",
    STREAMING = "streaming",
    EXECUTING_SQL = "executing_sql",
    RUNNING_ANALYTICS = "running_analytics",
}

export function useAgentAPIQuery(params: AgentApiQueryParams) {
    const {
        authToken,
        snowflakeUrl,
        ...agentRequestParams
    } = params;

    const { toolResources } = agentRequestParams;

    const [agentState, setAgentState] = React.useState<AgentApiState>(AgentApiState.IDLE);
    const [messages, setMessages] = React.useState<AgentMessage[]>([]);
    const [latestAssistantMessageId, setLatestAssistantMessageId] = React.useState<string | null>(null);

    const handleNewMessage = React.useCallback(async (input: string) => {
        if (!authToken) {
            toast.error("Authorization failed: Token is not defined");
            return;
        }

        const newMessages = structuredClone(messages);

        const latestUserMessageId = shortUUID.generate();

        newMessages.push({
            id: latestUserMessageId,
            role: AgentMessageRole.USER,
            content: [{ type: "text", text: input }],
        });

        setMessages(newMessages);

        const { headers, body } = buildStandardRequestParams({
            authToken,
            messages: removeFetchedTableFromMessages(newMessages),
            input,
            ...agentRequestParams,
        });

        setAgentState(AgentApiState.LOADING);
        const response = await fetch(
            `${snowflakeUrl}/api/v2/cortex/agent:run`,
            { method: 'POST', headers, body: JSON.stringify(body) }
        );
        console.log("Agent API response received:", response);  

        const latestAssistantMessageId = shortUUID.generate();
        setLatestAssistantMessageId(latestAssistantMessageId);
        const newAssistantMessage = getEmptyAssistantMessage(latestAssistantMessageId);

        const streamEvents = events(response);
        for await (const event of streamEvents) {
            if (event.data === "[DONE]") {
                setAgentState(AgentApiState.IDLE);
                return;
            }

            if (JSON.parse(event.data!).code) {
                toast.error(JSON.parse(event.data!).message);
                setAgentState(AgentApiState.IDLE);
                return;
            }

            const {
                delta: {
                    content: [textOrToolUseResponse, toolResultsResponse]
                }
            } = JSON.parse(event.data!);

            const { type, text } = textOrToolUseResponse;

            // normal text response
            if (type === "text" && text !== undefined) {
                appendTextToAssistantMessage(newAssistantMessage, text);
                setMessages(appendAssistantMessageToMessagesList(newAssistantMessage));
            } else if (type === "tool_use") {
                appendToolResponseToAssistantMessage(newAssistantMessage, textOrToolUseResponse);
                setMessages(appendAssistantMessageToMessagesList(newAssistantMessage));

                // a tool result (analyst / search)
                if (toolResultsResponse?.tool_results) {
                    appendToolResponseToAssistantMessage(newAssistantMessage, toolResultsResponse);
                    setMessages(appendAssistantMessageToMessagesList(newAssistantMessage));

                    const statement = toolResultsResponse.tool_results.content[0]?.json?.sql;

                    // if analyst returns a sql statement, run sql_exec tool
                    if (statement) {
                        setAgentState(AgentApiState.EXECUTING_SQL);
                        const tableResponse = await fetch(`${snowflakeUrl}/api/v2/statements`, {
                            method: 'POST',
                            body: JSON.stringify({
                                "statement": statement,
                                "parameters": {
                                    "BINARY_OUTPUT_FORMAT": "HEX",
                                    "DATE_OUTPUT_FORMAT": "YYYY-Mon-DD",
                                    "TIME_OUTPUT_FORMAT": "HH24:MI:SS",
                                    "TIMESTAMP_LTZ_OUTPUT_FORMAT": "",
                                    "TIMESTAMP_NTZ_OUTPUT_FORMAT": "YYYY-MM-DD HH24:MI:SS.FF3",
                                    "TIMESTAMP_TZ_OUTPUT_FORMAT": "",
                                    "TIMESTAMP_OUTPUT_FORMAT": "YYYY-MM-DD HH24:MI:SS.FF3 TZHTZM",
                                    "TIMEZONE": "America/Los_Angeles",
                                }
                            }),
                            headers: {
                                "Content-Type": "application/json",
                                "Accept": "application/json",
                                "User-Agent": "myApplicationName/1.0",
                                "X-Snowflake-Authorization-Token-Type": "KEYPAIR_JWT",
                                "Authorization": `Bearer ${authToken}`,
                            }
                        })

                        const tableData = await tableResponse.json();

                        if (tableData.code && tableData.message?.includes("Asynchronous execution in progress.")) {
                            toast.error("SQL execution took too long to respond. Please try again.");
                            return;
                        }

                        appendFetchedTableToAssistantMessage(newAssistantMessage, tableData, true);
                        setMessages(appendAssistantMessageToMessagesList(newAssistantMessage));

                        // run data2answer
                        const latestUserMessageId = shortUUID.generate();
                        const sqlExecUserMessage = getSQLExecUserMessage(latestUserMessageId, tableData.statementHandle)
                        const { headers, body } = buildStandardRequestParams({
                            authToken,
                            messages: removeFetchedTableFromMessages([...newMessages, newAssistantMessage, sqlExecUserMessage]),
                            input,
                            ...agentRequestParams,
                        });
                        setMessages(appendUserMessageToMessagesList(sqlExecUserMessage));
                        setAgentState(AgentApiState.RUNNING_ANALYTICS);
                        const data2AnalyticsResponse = await fetch(`${snowflakeUrl}/api/v2/cortex/agent:run`, {
                            method: 'POST',
                            headers,
                            body: JSON.stringify(body),
                        })
                        console.log("Data2Analytics response received:", data2AnalyticsResponse);

                        const data2AnalyticsStreamEvents = events(data2AnalyticsResponse);

                        const latestAssistantD2AMessageId = shortUUID.generate();
                        const newAssistantD2AMessage = getEmptyAssistantMessage(latestAssistantD2AMessageId);
                        for await (const event of data2AnalyticsStreamEvents) {
                            if (event.data === "[DONE]") {
                                setAgentState(AgentApiState.IDLE);
                                return;
                            }

                            if (JSON.parse(event.data!).code) {
                                toast.error(JSON.parse(event.data!).message);
                                setAgentState(AgentApiState.IDLE);
                                return;
                            }

                            const {
                                delta: {
                                    content: data2Contents
                                }
                            } = JSON.parse(event.data!);

                            data2Contents.forEach((content: AgentMessage['content'][number]) => {
                                if ('text' in content) {
                                    appendTextToAssistantMessage(newAssistantD2AMessage, content.text);
                                    setMessages(appendAssistantMessageToMessagesList(newAssistantD2AMessage));
                                } else if ('chart' in content) {
                                    appendChartToAssistantMessage(newAssistantD2AMessage, content.chart);
                                    setMessages(appendAssistantMessageToMessagesList(newAssistantD2AMessage));
                                } else if ('table' in content) {
                                    appendTableToAssistantMessage(newAssistantD2AMessage, content.table);
                                    setMessages(appendAssistantMessageToMessagesList(newAssistantD2AMessage));
                                    // When table type is returned, it means the table should be visualized.
                                    // In future, "table" type will contain "data" field enabling to render the table directly.
                                    // For now, we reuse the previously fetched data.
                                    appendFetchedTableToAssistantMessage(newAssistantD2AMessage, tableData, false);
                                    setMessages(appendAssistantMessageToMessagesList(newAssistantD2AMessage));
                                }
                                else {
                                    const tool_results = (content as AgentMessageToolResultsContent).tool_results;
                                    if (tool_results) {
                                        appendToolResponseToAssistantMessage(newAssistantD2AMessage, content);
                                        setMessages(appendAssistantMessageToMessagesList(newAssistantD2AMessage));
                                    }
                                }
                            })
                        }
                    }
                }
            } else {
                console.warn("Unexpected response from agent API: ", event.data);
                toast.error("Unexpected response from agent API");
            }

            // search returns citations first then text after. A bit of buffer time in between
            // making sure the state transitions smoothly
            if ((textOrToolUseResponse as AgentMessageToolUseContent).tool_use?.name !== "search1") {
                setAgentState(AgentApiState.STREAMING);
            }
        }
    }, [agentRequestParams, authToken, messages, snowflakeUrl, toolResources]);

    return {
        agentState,
        messages,
        handleNewMessage,
        latestAssistantMessageId
    };
}