/**
 * Google OAuth 토큰 해지
 * 로그아웃 시 Google refresh/access token을 무효화
 */
export async function revokeGoogleToken(token: string): Promise<void> {
  try {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
  } catch (error) {
    console.error("[Logout] Google token revocation failed:", error);
  }
}
