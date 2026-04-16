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

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

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
  controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
}

export async function POST(request: Request) {
  const fixture = await getFixture();
  const body = (await request.json().catch(() => ({}))) as { query?: string };
  const requestQuery = body.query?.trim();
  const query = requestQuery || fixture.query;
  const answer = fixture.answer;
  const shouldError = query.toLowerCase() === fixture.error_query.toLowerCase();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      if (!requestQuery) {
        enqueueEvent(controller, encoder, {
          type: "query",
          query,
        });
        await wait(120);
      }

      const text = shouldError ? answer.slice(0, 60) : answer;

      for (const token of text.match(/.{1,12}(\s|$)/g) ?? [text]) {
        enqueueEvent(controller, encoder, {
          type: "answer",
          chunk: token,
        });
        await wait(80);
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
        await wait(140);
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/x-ndjson; charset=utf-8",
    },
  });
}
