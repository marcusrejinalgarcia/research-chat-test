import { cookies } from "next/headers";
import { Auth } from "./auth";
import { Chat } from "./chat";

export default async function Home() {
  const cookieStore = await cookies();
  const isLoggedIn = cookieStore.get("mock-auth")?.value === "logged-in";
  const email = cookieStore.get("mock-user-email")?.value ?? "";

  if (isLoggedIn) {
    return <Chat initialEmail={email} />;
  }

  return <Auth />;
}
