import { readFile } from "node:fs/promises";
import { join } from "node:path";

type FixtureSource = {
  id: number;
  title: string;
  snippet: string;
  relevance_score: number;
};

type ChatFixture = {
  query: string;
  answer: string;
  sources: FixtureSource[];
  error_query: string;
};

type ChatStreamEvent =
  | {
      type: "answer";
      chunk: string;
    }
  | {
      type: "source";
      source: FixtureSource;
    };

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const INITIAL_RESPONSE_DELAY_MS = 500;
const TOKEN_DELAY_MS = 50;
const SOURCE_DELAY_MS = 100;

async function getFixture() {
  const filePath = join(process.cwd(), "mock", "fixture.json");
  const contents = await readFile(filePath, "utf8");

  return JSON.parse(contents) as ChatFixture;
}

function enqueueEvent(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  event: ChatStreamEvent,
) {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
}

export async function GET(request: Request) {
  const fixture = await getFixture();
  const url = new URL(request.url);

  const requestQuery = url.searchParams.get("query")?.trim();
  const query = requestQuery || fixture.query;
  const answer = fixture.answer;
  const shouldError = query.toLowerCase() === fixture.error_query.toLowerCase();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      await wait(INITIAL_RESPONSE_DELAY_MS);

      const text = shouldError ? answer.slice(0, 60) : answer;

      for (const token of text.match(/.{1,12}(\s|$)/g) ?? [text]) {
        enqueueEvent(controller, encoder, {
          type: "answer",
          chunk: token,
        });
        await wait(TOKEN_DELAY_MS);
      }

      if (shouldError) {
        controller.error(new Error("Fixture stream failed"));
        return;
      }

      for (const source of fixture.sources) {
        enqueueEvent(controller, encoder, {
          type: "source",
          source,
        });
        await wait(SOURCE_DELAY_MS);
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-store",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
      "X-Accel-Buffering": "no",
    },
  });
}
