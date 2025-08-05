import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// NextAuth App Router minimal adapter.
// Replit/proxy uyumu için kesin Node.js runtime kullan.
export const runtime = "nodejs";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
