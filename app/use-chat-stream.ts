"use client";

import { useCallback, useState } from "react";
import type { ChatMessage, FixtureSource } from "./chat-types";

type ChatStreamEvent =
  | {
      type: "answer";
      chunk: string;
    }
  | {
      type: "source";
      source: FixtureSource;
    };

const RECOVERY_MESSAGE = "Something went wrong. Please try again.";

function parseSseFrame(frame: string) {
  const data = frame
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.replace(/^data:\s?/, ""))
    .join("\n")
    .trim();

  if (!data) {
    return null;
  }

  return JSON.parse(data) as ChatStreamEvent;
}

export function useChatStream() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const replaceMessages = useCallback((nextMessages: ChatMessage[]) => {
    setMessages(nextMessages);
  }, []);
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const streamAnswer = useCallback(async (query: string) => {
    const userMessageId = Date.now();
    const assistantMessageId = userMessageId + 1;

    function updateAssistant(updater: (message: ChatMessage) => ChatMessage) {
      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.id === assistantMessageId ? updater(message) : message,
        ),
      );
    }

    function handleStreamEvent(event: ChatStreamEvent) {
      if (event.type === "answer") {
        updateAssistant((message) => ({
          ...message,
          body: `${message.body}${event.chunk}`,
        }));
      }

      if (event.type === "source") {
        updateAssistant((message) => ({
          ...message,
          sources: [...(message.sources ?? []), event.source],
        }));
      }
    }

    setIsStreaming(true);
    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: userMessageId,
        author: "you",
        body: query,
        time: "Now",
      },
      {
        id: assistantMessageId,
        author: "assistant",
        body: "",
        sources: [],
        time: "Now",
      },
    ]);

    try {
      const params = new URLSearchParams({ query });
      const response = await fetch(`/api/chat?${params.toString()}`);

      if (!response.ok || !response.body) {
        throw new Error("Chat stream failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";

        for (const frame of frames) {
          const event = parseSseFrame(frame);

          if (event) {
            handleStreamEvent(event);
          }
        }
      }

      const finalEvent = parseSseFrame(buffer);

      if (finalEvent) {
        handleStreamEvent(finalEvent);
      }
    } catch {
      updateAssistant((message) => ({
        ...message,
        body: RECOVERY_MESSAGE,
        sources: undefined,
      }));
    } finally {
      setIsStreaming(false);
    }
  }, []);

  return {
    clearMessages,
    isStreaming,
    messages,
    replaceMessages,
    streamAnswer,
  };
}
