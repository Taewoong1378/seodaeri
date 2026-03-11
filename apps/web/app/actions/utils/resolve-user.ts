import { createServiceClient } from '@repo/database/server'

/**
 * Resolves a user from the database by session user ID, with email fallback.
 * Returns the user row and an error string if not found.
 */
export async function resolveUser(
  session: { user?: { id?: string; email?: string | null } | null } | null,
  columns = 'id, spreadsheet_id',
): Promise<{ user: any; error: string | null }> {
  if (!session?.user?.id) {
    return { user: null, error: '사용자 정보를 찾을 수 없습니다.' }
  }

  const supabase = createServiceClient()

  let { data: user } = await supabase
    .from('users')
    .select(columns)
    .eq('id', session.user.id)
    .single()

  if (!user && session.user.email) {
    const { data: userByEmail } = await supabase
      .from('users')
      .select(columns)
      .eq('email', session.user.email)
      .single()

    if (userByEmail) {
      user = userByEmail
    }
  }

  if (!user) {
    return { user: null, error: '사용자 정보를 찾을 수 없습니다.' }
  }

  return { user, error: null }
}
