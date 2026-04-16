"use client";

import { useCallback, useEffect } from "react";
import type { ChatMessage } from "./chat-types";

const CHAT_SESSION_KEY = "research-chat:messages";

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const message = value as Partial<ChatMessage>;

  return (
    typeof message.id === "string" &&
    (message.author === "assistant" || message.author === "you") &&
    typeof message.body === "string" &&
    typeof message.time === "string"
  );
}

function readStoredMessages() {
  if (typeof window === "undefined") {
    return [];
  }

  const storedMessages = window.sessionStorage.getItem(CHAT_SESSION_KEY);
  if (!storedMessages) {
    return [];
  }

  try {
    const parsedMessages = JSON.parse(storedMessages) as unknown;

    if (!Array.isArray(parsedMessages) || !parsedMessages.every(isChatMessage)) {
      return [];
    }

    return parsedMessages;
  } catch {
    return [];
  }
}

export function useSessionMessages({
  isPaused,
  messages,
}: {
  isPaused: boolean;
  messages: ChatMessage[];
}) {
  const clearStoredMessages = useCallback(() => {
    window.sessionStorage.removeItem(CHAT_SESSION_KEY);
  }, []);

  const getStoredMessages = useCallback(() => readStoredMessages(), []);

  useEffect(() => {
    if (typeof window === "undefined" || isPaused) {
      return;
    }

    if (messages.length === 0) {
      window.sessionStorage.removeItem(CHAT_SESSION_KEY);
      return;
    }

    window.sessionStorage.setItem(CHAT_SESSION_KEY, JSON.stringify(messages));
  }, [isPaused, messages]);

  return {
    clearStoredMessages,
    getStoredMessages,
  };
}
