import NextAuth from 'next-auth'
import { authConfig } from './providers/auth-config'

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
