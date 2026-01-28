"use client";

import React from "react";
import shortUUID from "short-uuid";
import { toast } from "sonner";

import {
  AgentMessage,
  AgentMessageRole,
  AgentMessageToolResultsContent,
  AgentMessageToolUseContent,
} from "./types";

import {
  AgentRequestBuildParams,
  buildStandardRequestParams,
} from "./functions/buildStandardRequestParams";

import { getEmptyAssistantMessage } from "./functions/assistant/getEmptyAssistantMessage";
import { getSQLExecUserMessage } from "./functions/assistant/getSQLExecUserMessage";

import { appendTextToAssistantMessage } from "./functions/assistant/appendTextToAssistantMessage";
import { appendAssistantMessageToMessagesList } from "./functions/assistant/appendAssistantMessageToMessagesList";
import { appendUserMessageToMessagesList } from "./functions/assistant/appendUserMessageToMessagesList";
import { appendToolResponseToAssistantMessage } from "./functions/assistant/appendToolResponseToAssistantMessage";
import { appendFetchedTableToAssistantMessage } from "./functions/assistant/appendFetchedTableToAssistantMessage";
import { appendTableToAssistantMessage } from "./functions/assistant/appendTableToAssistantMessage";
import { appendChartToAssistantMessage } from "./functions/assistant/appendChartToAssistantMessage";
import { removeFetchedTableFromMessages } from "./functions/chat/removeFetchedTableFromMessages";

export interface AgentApiQueryParams
  extends Omit<AgentRequestBuildParams, "messages" | "input"> {
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
  const { authToken, snowflakeUrl, ...agentRequestParams } = params;

  const [agentState, setAgentState] = React.useState<AgentApiState>(
    AgentApiState.IDLE
  );
  const [messages, setMessages] = React.useState<AgentMessage[]>([]);
  const [latestAssistantMessageId, setLatestAssistantMessageId] =
    React.useState<string | null>(null);

  const handleNewMessage = React.useCallback(
    async (input: string) => {
      if (!authToken) {
        toast.error("Authorization failed: Token is missing");
        return;
      }

      // ---------------------------
      // 1. Add user message
      // ---------------------------
      const userMessageId = shortUUID.generate();
      const newMessages = structuredClone(messages);

      newMessages.push({
        id: userMessageId,
        role: AgentMessageRole.USER,
        content: [{ type: "text", text: input }],
      });

      setMessages(newMessages);

      // ---------------------------
      // 2. Build Cortex request
      // ---------------------------
      const { headers, body } = buildStandardRequestParams({
        authToken,
        messages: removeFetchedTableFromMessages(newMessages),
        input,
        ...agentRequestParams,
      });

      console.log("Cortex request body:", body);

      setAgentState(AgentApiState.LOADING);

      const response = await fetch(
        `${snowflakeUrl}/api/v2/cortex/agent:run`,
        {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-Snowflake-Authorization-Token-Type": "KEYPAIR_JWT",
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok || !response.body) {
        toast.error("Cortex Agent request failed");
        setAgentState(AgentApiState.IDLE);
        return;
      }

      // ---------------------------
      // 3. Prepare assistant message
      // ---------------------------
      const assistantMessageId = shortUUID.generate();
      setLatestAssistantMessageId(assistantMessageId);

      const assistantMessage = getEmptyAssistantMessage(assistantMessageId);

      // ---------------------------
      // 4. Stream Cortex response
      // ---------------------------
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;

          const data = JSON.parse(line);

          if (data.code) {
            toast.error(data.message);
            setAgentState(AgentApiState.IDLE);
            return;
          }

          if (data.done) {
            setAgentState(AgentApiState.IDLE);
            return;
          }

          const contents = data.delta?.content;
          if (!contents) continue;

          contents.forEach((item: any) => {
            // ---------------------------
            // TEXT
            // ---------------------------
            if (item.type === "text") {
              appendTextToAssistantMessage(assistantMessage, item.text);
              setMessages(
                appendAssistantMessageToMessagesList(assistantMessage)
              );
            }

            // ---------------------------
            // TOOL USE
            // ---------------------------
            else if (item.type === "tool_use") {
              appendToolResponseToAssistantMessage(assistantMessage, item);
              setMessages(
                appendAssistantMessageToMessagesList(assistantMessage)
              );
            }
          });

          setAgentState(AgentApiState.STREAMING);
        }
      }
    },
    [authToken, messages, snowflakeUrl, agentRequestParams]
  );

  return {
    agentState,
    messages,
    latestAssistantMessageId,
    handleNewMessage,
  };
}
