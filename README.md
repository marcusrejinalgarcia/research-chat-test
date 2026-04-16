# AI Research Chat UI

A Next.js take-home project for a mock AI research chat experience. It includes a lightweight auth shell, a chat UI with progressive streamed responses, citation-aware source cards, and session persistence.

## Features

- Mock login with email/password fields and a logout action.
- Single-page chat UI with chat history and multiple queries per session.
- Initial query is typed into the composer on page load, then submitted automatically.
- Mock SSE endpoint streams answer chunks from `mock/fixture.json`.
- Loading state appears while the first answer token is pending.
- Inline citations like `[1]` highlight the matching source card on hover/focus.
- Source cards stream in after the answer and expand to show snippets.
- `error` query simulates a mid-stream failure and shows a recovery message.
- Chat history persists in `sessionStorage`; `New chat` clears it after confirmation.

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS
- Zustand for mock auth state
- Server-Sent Events for the mock streaming endpoint

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## How To Use

1. Enter any email and password on the login screen.
2. The app stores mock auth state and opens the chat UI.
3. The initial research query types into the composer and submits automatically.
4. Send another query to append a new streamed answer.
5. Send `error` to test the simulated stream failure.
6. Use `New chat` to clear the saved session and restart.
7. Use `Logout` to return to the login screen.

## Mock Streaming API

The route handler at `app/api/chat/route.ts` reads `mock/fixture.json` and serves a mock SSE stream:

```text
GET /api/chat?query=What%20are%20the%20key%20capabilities...
```

Events are emitted as `data: ...` frames:

- `answer`: one streamed answer chunk
- `source`: one source document after answer streaming completes

The stream uses a short initial delay, then emits answer chunks every `50ms` to simulate token-by-token generation.

## Project Structure

- `app/auth.tsx`: mock login screen
- `app/chat.tsx`: chat layout, composer state, initial query flow, new chat flow
- `app/chat-message.tsx`: user and assistant message rendering
- `app/source-cards.tsx`: citation source card rendering
- `app/chat-types.ts`: shared chat/source types
- `app/use-chat-stream.ts`: SSE stream consumption and chat message updates
- `app/use-session-messages.ts`: sessionStorage persistence for chat history
- `app/api/chat/route.ts`: mock SSE endpoint
- `app/actions/auth.ts`: mock cookie-based login/logout actions
- `app/store/auth.ts`: Zustand auth state
- `mock/fixture.json`: mock query, answer, sources, and error trigger

## Validation

Run lint:

```bash
npm run lint
```

Run a production build:

```bash
npm run build
```

## Notes

- This is intentionally mock-only. There is no real auth backend or model provider.
- The auth cookie is `httpOnly`; the client also keeps lightweight Zustand state for immediate UI transitions.
- Chat history uses `sessionStorage`, so it survives reloads in the same browser tab/session.
- Source snippets are expandable on hover/focus to keep the chat response compact while still showing citation detail.
