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
        const agentUrl = `${snowflakeUrl}/api/v2/cortex/agent:run`;
        console.log('🚀 [Agent API] POST', agentUrl);
        console.log('📋 [Agent API] Request body:', JSON.stringify(body, null, 2));
        const response = await fetch(
            agentUrl,
            { method: 'POST', headers, body: JSON.stringify(body) }
        );
        console.log('✅ [Agent API] Response status:', response.status, response.statusText);

        const latestAssistantMessageId = shortUUID.generate();
        setLatestAssistantMessageId(latestAssistantMessageId);
        const newAssistantMessage = getEmptyAssistantMessage(latestAssistantMessageId);

        const streamEvents = events(response);
        for await (const event of streamEvents) {
            console.log('📡 [Agent API] Stream event:', event.data?.substring(0, 200) || '[empty]');
            if (event.data === "[DONE]") {
                console.log('✅ [Agent API] Stream complete');
                setAgentState(AgentApiState.IDLE);
                return;
            }

            const parsedData = JSON.parse(event.data!);
            if (parsedData.code) {
                console.error('❌ [Agent API] Error:', parsedData);
                toast.error(parsedData.message);
                setAgentState(AgentApiState.IDLE);
                return;
            }

            const {
                delta: {
                    content: [textOrToolUseResponse, toolResultsResponse]
                }
            } = parsedData;

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
                        const statementsUrl = `${snowflakeUrl}/api/v2/statements`;
                        console.log('🚀 [SQL Exec] POST', statementsUrl);
                        console.log('📋 [SQL Exec] Statement:', statement);
                        const tableResponse = await fetch(statementsUrl, {
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
                        console.log('✅ [SQL Exec] Response status:', tableResponse.status, tableResponse.statusText);

                        const tableData = await tableResponse.json();
                        console.log('📊 [SQL Exec] Response data:', JSON.stringify(tableData, null, 2));

                        if (tableData.code && tableData.message?.includes("Asynchronous execution in progress.")) {
                            console.warn('⚠️ [SQL Exec] Async execution in progress');
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
                        const data2AnalyticsUrl = `${snowflakeUrl}/api/v2/cortex/agent:run`;
                        console.log('🚀 [Data2Analytics] POST', data2AnalyticsUrl);
                        console.log('📋 [Data2Analytics] Request body:', JSON.stringify(body, null, 2));
                        const data2AnalyticsResponse = await fetch(data2AnalyticsUrl, {
                            method: 'POST',
                            headers,
                            body: JSON.stringify(body),
                        })
                        console.log('✅ [Data2Analytics] Response status:', data2AnalyticsResponse.status, data2AnalyticsResponse.statusText);

                        const data2AnalyticsStreamEvents = events(data2AnalyticsResponse);

                        const latestAssistantD2AMessageId = shortUUID.generate();
                        const newAssistantD2AMessage = getEmptyAssistantMessage(latestAssistantD2AMessageId);
                        for await (const event of data2AnalyticsStreamEvents) {
                            console.log('📡 [Data2Analytics] Stream event:', event.data?.substring(0, 200) || '[empty]');
                            if (event.data === "[DONE]") {
                                console.log('✅ [Data2Analytics] Stream complete');
                                setAgentState(AgentApiState.IDLE);
                                return;
                            }

                            const parsedD2AData = JSON.parse(event.data!);
                            if (parsedD2AData.code) {
                                console.error('❌ [Data2Analytics] Error:', parsedD2AData);
                                toast.error(parsedD2AData.message);
                                setAgentState(AgentApiState.IDLE);
                                return;
                            }

                            const {
                                delta: {
                                    content: data2Contents
                                }
                            } = parsedD2AData;

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