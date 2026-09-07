import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      if (
        pathname.startsWith("/login") ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/_next")
      ) {
        return true;
      }
      return Boolean(auth);
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id ?? "");
        session.user.role = (token.role as "DISPATCHER" | "VIEWER") ?? "VIEWER";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
