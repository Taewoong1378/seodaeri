import type { NextAuthConfig } from "next-auth";
import type { JWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

/**
 * 테스트 계정 설정 (Google Play Store 심사용)
 * - 실제 스프레드시트 연동 없이 데모 데이터 표시
 * - 배너/광고 숨김
 */
const TEST_ACCOUNT = {
  email: "reviewer@seodaeri.com",
  password: process.env.TEST_ACCOUNT_PASSWORD || "PlayStoreReview2026!",
  id: "test-reviewer-account",
  name: "Play Store Reviewer",
  image: null,
};

/**
 * Google OAuth access token 갱신
 */
async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken as string,
      }),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      console.error("Token refresh failed:", {
        status: response.status,
        error: refreshedTokens.error,
        error_description: refreshedTokens.error_description,
      });
      throw refreshedTokens;
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      // refresh_token은 갱신되지 않으면 기존 것 유지
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
    };
  } catch (error) {
    console.error("Error refreshing access token:", error);
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

export const authConfig: NextAuthConfig = {
  secret: process.env.AUTH_SECRET,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          // drive.file 스코프만 사용 (Google Picker + setAppId로 권한 부여)
          // spreadsheets 스코프 제거 - OAuth 인증 심사 불필요
          scope:
            "openid email profile https://www.googleapis.com/auth/drive.file",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
    // 테스트 계정용 Credentials Provider (Google Play Store 심사용)
    Credentials({
      id: "test-credentials",
      name: "Test Account",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string;
        const password = credentials?.password as string;

        // 테스트 계정만 허용
        if (email === TEST_ACCOUNT.email && password === TEST_ACCOUNT.password) {
          return {
            id: TEST_ACCOUNT.id,
            email: TEST_ACCOUNT.email,
            name: TEST_ACCOUNT.name,
            image: TEST_ACCOUNT.image,
          };
        }

        return null;
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/auth/error",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email || !user.id) return false;

      // 테스트 계정은 바로 통과 (Supabase 저장 없음)
      if (account?.provider === "test-credentials") {
        console.log("[Auth] Test account login:", user.email);
        return true;
      }

      // Google 로그인 시 drive.file 스코프 필수 체크
      if (account?.provider === "google") {
        const grantedScopes = account.scope?.split(" ") || [];
        const hasDriveScope = grantedScopes.some(
          (scope) => scope === "https://www.googleapis.com/auth/drive.file"
        );

        if (!hasDriveScope) {
          console.error("Required scope 'drive.file' was not granted by user");
          // 에러 페이지로 리다이렉트 (scope_denied 에러)
          return "/login?error=scope_denied";
        }
      }

      try {
        // Supabase에 유저 정보 저장/업데이트
        const { createServiceClient } = await import("@repo/database/server");
        const supabase = createServiceClient();

        // 이메일 기준으로 upsert (같은 이메일이면 ID 업데이트)
        const { error } = await supabase.from("users").upsert(
          {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "email" }
        );

        if (error) {
          console.error("Failed to save user to Supabase:", error);
        }
      } catch (err) {
        console.error("Supabase upsert error:", err);
      }

      return true;
    },
    async jwt({ token, user, account }) {
      // 첫 로그인 시 토큰 저장
      if (account && user) {
        // 테스트 계정인 경우 isDemo 플래그 설정
        const isDemo = account.provider === "test-credentials";

        return {
          ...token,
          accessToken: isDemo ? undefined : account.access_token,
          refreshToken: isDemo ? undefined : account.refresh_token,
          accessTokenExpires: isDemo
            ? Date.now() + 30 * 24 * 60 * 60 * 1000 // 30일
            : account.expires_at
              ? account.expires_at * 1000
              : Date.now() + 3600 * 1000,
          provider: account.provider,
          id: user.id,
          isDemo,
        };
      }

      // 테스트 계정은 토큰 갱신 불필요
      if (token.isDemo) {
        return token;
      }

      // 토큰이 아직 유효하면 그대로 반환
      if (Date.now() < ((token.accessTokenExpires as number) || 0)) {
        return token;
      }

      // 토큰 만료 시 갱신
      console.log("Access token expired, refreshing...");
      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.accessToken = token.accessToken as string;
        session.refreshToken = token.refreshToken as string;
        session.isDemo = token.isDemo as boolean;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
};

// Extend the built-in session types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
    accessToken?: string;
    refreshToken?: string;
    /** 테스트 계정 여부 (Play Store 심사용) */
    isDemo?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    provider?: string;
    error?: string;
    /** 테스트 계정 여부 (Play Store 심사용) */
    isDemo?: boolean;
  }
}
