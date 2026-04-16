"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOutMock } from "./actions/auth";
import { ChatMessageRow } from "./chat-message";
import type { ActiveSource, ChatMessage, FixtureSource } from "./chat-types";
import { useAuthStore } from "./store/auth";

type ChatProps = {
  initialEmail?: string;
};

type InitialQueryResponse = {
  query: string;
};

type ChatStreamEvent =
  | {
      type: "query";
      query: string;
    }
  | {
      type: "answer";
      chunk: string;
    }
  | {
      type: "source";
      source: FixtureSource;
    };

const RECOVERY_MESSAGE = "Something went wrong. Please try again.";
const INITIAL_QUERY_TYPE_INTERVAL_MS = 22;
const CHAT_SESSION_KEY = "research-chat:messages";

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getEmailInitial(email: string) {
  return email.trim().charAt(0).toUpperCase() || "U";
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
    const parsedMessages = JSON.parse(storedMessages) as ChatMessage[];

    if (!Array.isArray(parsedMessages)) {
      return [];
    }

    return parsedMessages;
  } catch {
    return [];
  }
}

export function Chat({ initialEmail = "" }: ChatProps) {
  const router = useRouter();
  const storedEmail = useAuthStore((state) => state.email);
  const logout = useAuthStore((state) => state.logout);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [activeSource, setActiveSource] = useState<ActiveSource | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isTypingInitialQuery, setIsTypingInitialQuery] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isConfirmingNewChat, setIsConfirmingNewChat] = useState(false);
  const hasStartedFixture = useRef(false);
  const email = storedEmail || initialEmail || "you@example.com";

  const streamAnswer = useCallback(async (query?: string) => {
    const userMessageId = Date.now();
    const assistantMessageId = userMessageId + 1;
    let hasStartedMessages = Boolean(query);

    function startMessages(nextQuery: string) {
      hasStartedMessages = true;
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: userMessageId,
          author: "you",
          body: nextQuery,
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
    }

    function updateAssistant(updater: (message: ChatMessage) => ChatMessage) {
      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.id === assistantMessageId ? updater(message) : message,
        ),
      );
    }

    function showRecoveryMessage() {
      if (!hasStartedMessages) {
        setMessages([
          {
            id: assistantMessageId,
            author: "assistant",
            body: RECOVERY_MESSAGE,
            time: "Now",
          },
        ]);
        return;
      }

      updateAssistant((message) => ({
        ...message,
        body: RECOVERY_MESSAGE,
        sources: undefined,
      }));
    }

    setIsStreaming(true);
    setActiveSource(null);

    if (query) {
      startMessages(query);
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(query ? { query } : {}),
      });

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
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) {
            continue;
          }

          const event = JSON.parse(line) as ChatStreamEvent;

          if (event.type === "query" && !hasStartedMessages) {
            startMessages(event.query);
          }

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
      }

      const finalLine = buffer.trim();
      if (finalLine) {
        const event = JSON.parse(finalLine) as ChatStreamEvent;

        if (event.type === "source") {
          updateAssistant((message) => ({
            ...message,
            sources: [...(message.sources ?? []), event.source],
          }));
        }
      }
    } catch {
      showRecoveryMessage();
    } finally {
      setIsStreaming(false);
    }
  }, []);

  const startInitialChat = useCallback(async () => {
    const response = await fetch("/api/chat");

    if (!response.ok) {
      throw new Error("Initial query failed");
    }

    const initial = (await response.json()) as InitialQueryResponse;
    setIsTypingInitialQuery(true);
    setDraft("");

    for (let index = 1; index <= initial.query.length; index += 1) {
      setDraft(initial.query.slice(0, index));
      await wait(INITIAL_QUERY_TYPE_INTERVAL_MS);
    }

    await wait(250);
    setDraft("");
    setIsTypingInitialQuery(false);
    await streamAnswer(initial.query);
  }, [streamAnswer]);

  useEffect(() => {
    if (hasStartedFixture.current) {
      return;
    }

    hasStartedFixture.current = true;

    async function restoreOrStartInitialChat() {
      const storedMessages = readStoredMessages();

      if (storedMessages.length > 0) {
        setMessages(storedMessages);
        return;
      }

      await startInitialChat();
    }

    restoreOrStartInitialChat().catch(() => {
      setIsTypingInitialQuery(false);
      setMessages([
        {
          id: Date.now(),
          author: "assistant",
          body: RECOVERY_MESSAGE,
          time: "Now",
        },
      ]);
      setIsStreaming(false);
    });
  }, [startInitialChat]);

  useEffect(() => {
    if (typeof window === "undefined" || isStreaming || isTypingInitialQuery) {
      return;
    }

    if (messages.length === 0) {
      window.sessionStorage.removeItem(CHAT_SESSION_KEY);
      return;
    }

    window.sessionStorage.setItem(CHAT_SESSION_KEY, JSON.stringify(messages));
  }, [isStreaming, isTypingInitialQuery, messages]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedDraft = draft.trim();
    if (!trimmedDraft || isStreaming || isTypingInitialQuery) {
      return;
    }

    setIsConfirmingNewChat(false);
    setDraft("");
    void streamAnswer(trimmedDraft);
  }

  async function handleLogout() {
    setIsLoggingOut(true);
    await signOutMock();
    window.sessionStorage.removeItem(CHAT_SESSION_KEY);
    logout();
    router.refresh();
  }

  async function handleNewChat() {
    setIsConfirmingNewChat(false);
    window.sessionStorage.removeItem(CHAT_SESSION_KEY);
    setActiveSource(null);
    setDraft("");
    setMessages([]);

    try {
      await startInitialChat();
    } catch {
      setIsTypingInitialQuery(false);
      setIsStreaming(false);
      setMessages([
        {
          id: Date.now(),
          author: "assistant",
          body: RECOVERY_MESSAGE,
          time: "Now",
        },
      ]);
    }
  }

  return (
    <main className="flex min-h-screen bg-[#f8faf7] text-[#181a1f]">
      <aside className="hidden min-h-screen w-72 flex-col border-r border-[#d8ded8] bg-[#ffffff] px-5 py-6 md:flex">
        <div>
          <div className="mb-8 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-[#16785c] text-sm font-bold text-white">
              RC
            </div>
            <div>
              <p className="text-sm font-semibold">Research Chat</p>
              <p className="text-xs text-[#626a66]">Mock session</p>
            </div>
          </div>

          <nav aria-label="Chats" className="space-y-2">
            <button className="w-full rounded-lg bg-[#eef7f2] px-3 py-3 text-left text-sm font-medium text-[#163f33]">
              CrowdStrike Falcon Capabilities
            </button>
            <button className="w-full rounded-lg px-3 py-3 text-left text-sm text-[#626a66] hover:bg-[#f1f3f1]">
              Literature scan
            </button>
            <button className="w-full rounded-lg px-3 py-3 text-left text-sm text-[#626a66] hover:bg-[#f1f3f1]">
              Follow-up ideas
            </button>
          </nav>
        </div>

        <div
          aria-label="Current user"
          className="mt-auto flex items-center gap-3 rounded-lg border border-[#d8ded8] bg-white px-3 py-3"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#1f2937] text-sm font-semibold text-white">
            {getEmailInitial(email)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{email}</p>
            <p className="text-xs text-[#626a66]">Signed in</p>
          </div>
          <button
            className="h-9 rounded-lg border border-[#cbd5cf] px-3 text-sm font-medium text-[#343946] transition hover:bg-[#f1f3f1] disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isLoggingOut}
            onClick={handleLogout}
            type="button"
          >
            {isLoggingOut ? "Logging out" : "Logout"}
          </button>
        </div>
      </aside>

      <section className="flex min-h-screen flex-1 flex-col">
        <header className="border-b border-[#d8ded8] bg-white px-5 py-4 sm:px-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase text-[#626a66]">
                Streaming chat
              </p>
              <h1 className="text-2xl font-semibold">CrowdStrike Falcon Capabilities</h1>
            </div>
            <div className="rounded-lg border border-[#d8ded8] px-3 py-2 text-sm text-[#4b514e]">
              Online
            </div>
          </div>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-6 sm:px-8">
          {messages.map((message) => (
            <ChatMessageRow
              activeSource={activeSource}
              key={message.id}
              message={message}
              setActiveSource={setActiveSource}
            />
          ))}
        </div>

        <form
          className="border-t border-[#d8ded8] bg-white p-4 sm:px-8"
          onSubmit={handleSubmit}
        >
          <div className="flex gap-3">
            <div className="relative">
              {isConfirmingNewChat && (
                <div className="absolute bottom-14 left-0 z-10 w-72 rounded-lg border border-[#d8ded8] bg-white p-4 shadow-lg">
                  <p className="text-sm font-semibold">Start a new chat?</p>
                  <p className="mt-1 text-sm leading-5 text-[#626a66]">
                    This clears the saved chat for this browser session.
                  </p>
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      className="h-9 rounded-lg border border-[#cbd5cf] px-3 text-sm font-medium text-[#343946] transition hover:bg-[#f1f3f1]"
                      onClick={() => setIsConfirmingNewChat(false)}
                      type="button"
                    >
                      Cancel
                    </button>
                    <button
                      className="h-9 rounded-lg bg-[#d94b38] px-3 text-sm font-semibold text-white transition hover:bg-[#bf3f30]"
                      onClick={handleNewChat}
                      type="button"
                    >
                      New chat
                    </button>
                  </div>
                </div>
              )}
              <button
                className="h-12 whitespace-nowrap rounded-lg border border-[#cbd5cf] px-5 text-base font-semibold text-[#343946] transition hover:bg-[#f1f3f1] focus:outline-none focus:ring-4 focus:ring-[#16785c]/15 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isStreaming || isTypingInitialQuery}
                onClick={() => setIsConfirmingNewChat(true)}
                type="button"
              >
                New chat
              </button>
            </div>
            <label className="sr-only" htmlFor="chat-message">
              Message
            </label>
            <input
              className="h-12 min-w-0 flex-1 rounded-lg border border-[#cbd5cf] bg-white px-4 text-base outline-none transition focus:border-[#16785c] focus:ring-4 focus:ring-[#16785c]/15"
              disabled={isStreaming || isTypingInitialQuery}
              id="chat-message"
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Write a message..."
              value={draft}
            />
            <button
              className="h-12 rounded-lg bg-[#d94b38] px-5 text-base font-semibold text-white transition hover:bg-[#bf3f30] focus:outline-none focus:ring-4 focus:ring-[#d94b38]/20 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isStreaming || isTypingInitialQuery}
              type="submit"
            >
              {isStreaming || isTypingInitialQuery ? "Streaming" : "Send"}
            </button>
          </div>
        </form>
      </section>

    </main>
  );
}
