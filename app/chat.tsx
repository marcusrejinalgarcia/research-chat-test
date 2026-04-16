"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOutMock } from "./actions/auth";
import { useAuthStore } from "./store/auth";

type ChatMessage = {
  id: number;
  author: "assistant" | "you";
  body: string;
  sources?: FixtureSource[];
  time: string;
};

type ChatProps = {
  initialEmail?: string;
};

type FixtureSource = {
  id: number;
  title: string;
  snippet: string;
  relevance_score: number;
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

function getEmailInitial(email: string) {
  return email.trim().charAt(0).toUpperCase() || "U";
}

function renderAnswerText(
  text: string,
  sources: FixtureSource[] | undefined,
  setActiveSourceId: (sourceId: number | null) => void,
) {
  if (!text) {
    return "Thinking...";
  }

  if (!sources?.length) {
    return text;
  }

  const sourceIds = new Set(sources.map((source) => source.id));
  const parts = text.split(/(\[\d+\])/g);

  return parts.map((part, index) => {
    const citationId = Number(part.match(/^\[(\d+)\]$/)?.[1]);

    if (!citationId || !sourceIds.has(citationId)) {
      return <span key={`${part}-${index}`}>{part}</span>;
    }

    return (
      <button
        className="mx-0.5 rounded border border-[#9ac6b3] bg-[#eef7f2] px-1.5 py-0.5 text-xs font-semibold text-[#125c47] transition hover:bg-[#d8f0e4] focus:outline-none focus:ring-2 focus:ring-[#16785c]/25"
        key={`${part}-${index}`}
        onBlur={() => setActiveSourceId(null)}
        onFocus={() => setActiveSourceId(citationId)}
        onMouseEnter={() => setActiveSourceId(citationId)}
        onMouseLeave={() => setActiveSourceId(null)}
        type="button"
      >
        {part}
      </button>
    );
  });
}

export function Chat({ initialEmail = "" }: ChatProps) {
  const router = useRouter();
  const storedEmail = useAuthStore((state) => state.email);
  const logout = useAuthStore((state) => state.logout);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [activeSourceId, setActiveSourceId] = useState<number | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
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
    setActiveSourceId(null);

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

  useEffect(() => {
    if (hasStartedFixture.current) {
      return;
    }

    hasStartedFixture.current = true;

    streamAnswer().catch(() => {
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
  }, [streamAnswer]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedDraft = draft.trim();
    if (!trimmedDraft || isStreaming) {
      return;
    }

    setDraft("");
    void streamAnswer(trimmedDraft);
  }

  async function handleLogout() {
    setIsLoggingOut(true);
    await signOutMock();
    logout();
    router.refresh();
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
          {messages.map((message) => {
            const isUser = message.author === "you";

            return (
              <article
                className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                key={message.id}
              >
                {!isUser && (
                  <div className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#16785c] text-xs font-bold text-white">
                    AI
                  </div>
                )}

                <div
                  className={`flex max-w-[min(38rem,78vw)] flex-col gap-3 ${
                    isUser ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`rounded-lg px-4 py-3 shadow-sm ${
                      isUser
                        ? "bg-[#1f2937] text-white"
                        : "border border-[#d8ded8] bg-white text-[#181a1f]"
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm leading-6">
                      {isUser
                        ? message.body
                        : renderAnswerText(
                            message.body,
                            message.sources,
                            setActiveSourceId,
                          )}
                    </p>
                    <p
                      className={`mt-2 text-xs ${
                        isUser ? "text-[#d4d9df]" : "text-[#626a66]"
                      }`}
                    >
                      {message.time}
                    </p>
                  </div>

                  {!isUser && !!message.sources?.length && (
                    <div className="grid w-full gap-2">
                      {message.sources.map((source) => {
                        const isActive = activeSourceId === source.id;

                        return (
                          <article
                            className={`rounded-lg border px-3 py-2 transition ${
                              isActive
                                ? "border-[#16785c] bg-[#eef7f2]"
                                : "border-[#d8ded8] bg-white"
                            }`}
                            key={source.id}
                            onBlur={() => setActiveSourceId(null)}
                            onFocus={() => setActiveSourceId(source.id)}
                            onMouseEnter={() => setActiveSourceId(source.id)}
                            onMouseLeave={() => setActiveSourceId(null)}
                            tabIndex={0}
                          >
                            <div className="flex items-start gap-2">
                              <span className="rounded bg-[#1f2937] px-1.5 py-0.5 text-xs font-semibold text-white">
                                [{source.id}]
                              </span>
                              <div className="min-w-0">
                                <h2 className="truncate text-sm font-semibold">
                                  {source.title}
                                </h2>
                                <p className="mt-1 text-xs text-[#626a66]">
                                  Relevance{" "}
                                  {Math.round(source.relevance_score * 100)}%
                                </p>
                              </div>
                            </div>
                            {isActive && (
                              <p className="mt-3 text-sm leading-6 text-[#343946]">
                                {source.snippet}
                              </p>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <form
          className="border-t border-[#d8ded8] bg-white p-4 sm:px-8"
          onSubmit={handleSubmit}
        >
          <div className="flex gap-3">
            <label className="sr-only" htmlFor="chat-message">
              Message
            </label>
            <input
              className="h-12 min-w-0 flex-1 rounded-lg border border-[#cbd5cf] bg-white px-4 text-base outline-none transition focus:border-[#16785c] focus:ring-4 focus:ring-[#16785c]/15"
              disabled={isStreaming}
              id="chat-message"
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Write a message..."
              value={draft}
            />
            <button
              className="h-12 rounded-lg bg-[#d94b38] px-5 text-base font-semibold text-white transition hover:bg-[#bf3f30] focus:outline-none focus:ring-4 focus:ring-[#d94b38]/20 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isStreaming}
              type="submit"
            >
              {isStreaming ? "Streaming" : "Send"}
            </button>
          </div>
        </form>
      </section>

    </main>
  );
}
