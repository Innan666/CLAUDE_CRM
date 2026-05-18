import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      teamId: string
      teamName: string
    } & DefaultSession["user"]
  }

  interface User {
    role: string
    teamId: string
    teamName: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: string
    teamId: string
    teamName: string
  }
}
