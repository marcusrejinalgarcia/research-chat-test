import Image from "next/image";
import type { ActiveSource, ChatMessage, FixtureSource } from "./chat-types";

type ChatMessageRowProps = {
  activeSource: ActiveSource | null;
  message: ChatMessage;
  setActiveSource: (activeSource: ActiveSource | null) => void;
};

type AnswerTextProps = {
  messageId: number;
  setActiveSource: (activeSource: ActiveSource | null) => void;
  sources: FixtureSource[] | undefined;
  text: string;
};

type SourceCardsProps = {
  activeSource: ActiveSource | null;
  messageId: number;
  setActiveSource: (activeSource: ActiveSource | null) => void;
  sources: FixtureSource[];
};

function AnswerText({
  messageId,
  setActiveSource,
  sources,
  text,
}: AnswerTextProps) {
  if (!text) {
    return (
      <Image
        alt="Loading response"
        className="size-8"
        height={32}
        src="/loading_ring.gif"
        unoptimized
        width={32}
      />
    );
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
        onBlur={() => setActiveSource(null)}
        onFocus={() => setActiveSource({ messageId, sourceId: citationId })}
        onMouseEnter={() => setActiveSource({ messageId, sourceId: citationId })}
        onMouseLeave={() => setActiveSource(null)}
        type="button"
      >
        {part}
      </button>
    );
  });
}

function SourceCards({
  activeSource,
  messageId,
  setActiveSource,
  sources,
}: SourceCardsProps) {
  return (
    <div className="grid w-full gap-2">
      {sources.map((source) => {
        const isActive =
          activeSource?.messageId === messageId &&
          activeSource.sourceId === source.id;

        return (
          <article
            className={`rounded-lg border px-3 py-2 transition ${
              isActive
                ? "border-[#16785c] bg-[#eef7f2]"
                : "border-[#d8ded8] bg-white"
            }`}
            key={source.id}
            onBlur={() => setActiveSource(null)}
            onFocus={() =>
              setActiveSource({
                messageId,
                sourceId: source.id,
              })
            }
            onMouseEnter={() =>
              setActiveSource({
                messageId,
                sourceId: source.id,
              })
            }
            onMouseLeave={() => setActiveSource(null)}
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
                  Relevance {Math.round(source.relevance_score * 100)}%
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
  );
}

export function ChatMessageRow({
  activeSource,
  message,
  setActiveSource,
}: ChatMessageRowProps) {
  const isUser = message.author === "you";

  return (
    <article
      className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
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
            {isUser ? (
              message.body
            ) : (
              <AnswerText
                messageId={message.id}
                setActiveSource={setActiveSource}
                sources={message.sources}
                text={message.body}
              />
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
          <SourceCards
            activeSource={activeSource}
            messageId={message.id}
            setActiveSource={setActiveSource}
            sources={message.sources}
          />
        )}
      </div>
    </article>
  );
}
