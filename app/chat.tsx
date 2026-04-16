"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { signOutMock } from "./actions/auth";
import { useAuthStore } from "./store/auth";

type ChatMessage = {
  id: number;
  author: "assistant" | "you";
  body: string;
  time: string;
};

type ChatProps = {
  initialEmail?: string;
};

const initialMessages: ChatMessage[] = [
  {
    id: 1,
    author: "assistant",
    body: "Welcome back. Drop a thought here and I will keep the thread moving.",
    time: "9:40 AM",
  },
  {
    id: 2,
    author: "you",
    body: "Can you help me turn the fixture data into a quick summary?",
    time: "9:42 AM",
  },
  {
    id: 3,
    author: "assistant",
    body: "Yes. Send over the angle you want, or I can start with the strongest patterns.",
    time: "9:43 AM",
  },
];

function getEmailInitial(email: string) {
  return email.trim().charAt(0).toUpperCase() || "U";
}

export function Chat({ initialEmail = "" }: ChatProps) {
  const router = useRouter();
  const storedEmail = useAuthStore((state) => state.email);
  const logout = useAuthStore((state) => state.logout);
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const email = storedEmail || initialEmail || "you@example.com";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedDraft = draft.trim();
    if (!trimmedDraft) {
      return;
    }

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: Date.now(),
        author: "you",
        body: trimmedDraft,
        time: "Now",
      },
    ]);
    setDraft("");
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
              Fixture notes
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
                Mock chat
              </p>
              <h1 className="text-2xl font-semibold">Fixture notes</h1>
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
                  className={`max-w-[min(38rem,78vw)] rounded-lg px-4 py-3 shadow-sm ${
                    isUser
                      ? "bg-[#1f2937] text-white"
                      : "border border-[#d8ded8] bg-white text-[#181a1f]"
                  }`}
                >
                  <p className="text-sm leading-6">{message.body}</p>
                  <p
                    className={`mt-2 text-xs ${
                      isUser ? "text-[#d4d9df]" : "text-[#626a66]"
                    }`}
                  >
                    {message.time}
                  </p>
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
              id="chat-message"
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Write a message..."
              value={draft}
            />
            <button
              className="h-12 rounded-lg bg-[#d94b38] px-5 text-base font-semibold text-white transition hover:bg-[#bf3f30] focus:outline-none focus:ring-4 focus:ring-[#d94b38]/20"
              type="submit"
            >
              Send
            </button>
          </div>
        </form>
      </section>

    </main>
  );
}
