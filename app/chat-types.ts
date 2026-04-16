export type FixtureSource = {
  id: number;
  title: string;
  snippet: string;
  relevance_score: number;
};

export type ChatMessage = {
  id: string;
  author: "assistant" | "you";
  body: string;
  sources?: FixtureSource[];
  time: string;
};

export type ActiveSource = {
  messageId: string;
  sourceId: number;
};
