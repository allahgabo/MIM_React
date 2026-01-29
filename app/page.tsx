"use client"

import { AgentApiState, AgentRequestBuildParams, CORTEX_ANALYST_TOOL, CORTEX_SEARCH_TOOL, DATA_TO_CHART_TOOL, SQL_EXEC_TOOL, useAgentAPIQuery } from "@/lib/agent-api";
import { useAccessToken } from "@/lib/auth";
import { Messages } from "./components/messages";
import { ChatInput } from "./components/input";
import { ChatHeader } from "./components/chat-header";

export default function Home() {
  // Agent API requires a JWT auth token. For simplicity we are using an api to fetch this,
  // but this can be easily replaced with a login layer and session management
  const { token: jwtToken } = useAccessToken();

  const tools: AgentRequestBuildParams['tools'] = [
    CORTEX_SEARCH_TOOL,
    CORTEX_ANALYST_TOOL,
    DATA_TO_CHART_TOOL,
    SQL_EXEC_TOOL,
  ]

  // Only enable search tool if:
  // 1. NEXT_PUBLIC_SEARCH_SERVICE_PATH is set and valid
  // 2. NEXT_PUBLIC_DISABLE_SEARCH_TOOL is not "true"
  // This avoids 400 errors when the search service is not configured in Snowflake.
  const searchService = process.env.NEXT_PUBLIC_SEARCH_SERVICE_PATH;
  const disableSearch = process.env.NEXT_PUBLIC_DISABLE_SEARCH_TOOL === 'true';
  const disableAnalyst = process.env.NEXT_PUBLIC_DISABLE_ANALYST_TOOL === 'true';
  const effectiveTools = [...tools];
  const toolResources: Record<string, any> = {};

  // Remove analyst tool if disabled
  if (disableAnalyst) {
    const analyzeIdx = effectiveTools.indexOf(CORTEX_ANALYST_TOOL as any);
    if (analyzeIdx !== -1) effectiveTools.splice(analyzeIdx, 1);
  } else if (process.env.NEXT_PUBLIC_SEMANTIC_MODEL_PATH) {
    // Add analyst resource only if enabled and semantic model path is provided
    toolResources["analyst1"] = { "semantic_model_file": process.env.NEXT_PUBLIC_SEMANTIC_MODEL_PATH };
  }

  // Remove search tool if disabled
  if (disableSearch) {
    const searchIdx = effectiveTools.indexOf(CORTEX_SEARCH_TOOL as any);
    if (searchIdx !== -1) effectiveTools.splice(searchIdx, 1);
  } else if (searchService && searchService !== 'your_search_service_name') {
    // Add search resource only if enabled and service is configured
    toolResources["search1"] = { search_service: searchService, max_results: 10 };
  }

  const { agentState, messages, latestAssistantMessageId, handleNewMessage } = useAgentAPIQuery({
    authToken: jwtToken,
    snowflakeUrl: process.env.NEXT_PUBLIC_SNOWFLAKE_URL!,
    experimental: {
      EnableRelatedQueries: true,
    },
    tools: effectiveTools,
    toolResources
  })

  return (
    <>
      <div className="flex flex-col min-w-0 h-dvh bg-background">
        <ChatHeader />

        <Messages
          agentState={agentState}
          messages={messages}
          latestAssistantMessageId={latestAssistantMessageId}
        />

        <form className="flex mx-auto px-4 bg-background pb-4 md:pb-6 gap-2 w-full md:max-w-3xl">
          <ChatInput
            isLoading={agentState !== AgentApiState.IDLE}
            messagesLength={messages.length}
            handleSubmit={handleNewMessage} />
        </form>
      </div>
    </>
  );
}
