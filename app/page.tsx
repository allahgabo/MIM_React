"use client"

import { AgentApiState, AgentRequestBuildParams, CORTEX_ANALYST_TOOL, CORTEX_SEARCH_TOOL, DATA_TO_CHART_TOOL, SQL_EXEC_TOOL, useAgentAPIQuery } from "@/lib/agent-api";
import { useAccessToken } from "@/lib/auth";
import { Messages } from "./components/messages";
import { ChatInput } from "./components/input";
import { ChatHeader } from "./components/chat-header";

export default function Home() {
  const { token: jwtToken, isLoading: tokenLoading, error: tokenError, refetch } = useAccessToken();

  const tools: AgentRequestBuildParams['tools'] = [
    CORTEX_SEARCH_TOOL,
    CORTEX_ANALYST_TOOL,
    DATA_TO_CHART_TOOL,
    SQL_EXEC_TOOL,
  ]

  const { agentState, messages, latestAssistantMessageId, handleNewMessage } = useAgentAPIQuery({
    authToken: jwtToken,
    snowflakeUrl: process.env.NEXT_PUBLIC_SNOWFLAKE_URL!,
    experimental: {
      EnableRelatedQueries: true,
    },
    tools,
    toolResources: {
      "analyst1": { "semantic_model_file": process.env.NEXT_PUBLIC_SEMANTIC_MODEL_PATH },
      "search1": { "search_service": process.env.NEXT_PUBLIC_SEARCH_SERVICE_PATH, max_results: 10 }
    }
  })

  // Show error state
  if (tokenError) {
    return (
      <div className="flex items-center justify-center h-dvh bg-background">
        <div className="text-center max-w-md p-6">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">Authentication Error</h2>
          <p className="text-muted-foreground mb-4">{tokenError}</p>
          <div className="space-y-2">
            <button 
              onClick={refetch} 
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Retry
            </button>
            <details className="text-left text-sm">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Troubleshooting
              </summary>
              <div className="mt-2 p-3 bg-muted rounded text-xs space-y-1">
                <p>Common issues:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Check Vercel environment variables are set</li>
                  <li>Verify SNOWFLAKE_PRIVATE_KEY_BASE64 is correct</li>
                  <li>Check Vercel function logs for details</li>
                  <li>Ensure SNOWFLAKE_ACCOUNT format is correct</li>
                </ul>
              </div>
            </details>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state
  if (tokenLoading || !jwtToken) {
    return (
      <div className="flex items-center justify-center h-dvh bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Authenticating...</p>
        </div>
      </div>
    );
  }

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