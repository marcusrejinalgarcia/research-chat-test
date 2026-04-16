import type { ActiveSource, FixtureSource } from "./chat-types";

type SourceCardsProps = {
  activeSource: ActiveSource | null;
  messageId: string;
  setActiveSource: (activeSource: ActiveSource | null) => void;
  sources: FixtureSource[];
};

export function SourceCards({
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
