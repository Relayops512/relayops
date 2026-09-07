import { type DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: "DISPATCHER" | "VIEWER";
    };
  }

  interface User {
    role?: "DISPATCHER" | "VIEWER";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "DISPATCHER" | "VIEWER";
  }
}
