import type { MetadataRoute } from 'next'
import { SITE_URL } from '../lib/constants'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  // 정적 페이지들
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/login`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]

  // 인증 필요한 페이지들은 sitemap에서 제외
  // (dashboard, portfolio, transactions, settings 등)

  return staticPages
}
