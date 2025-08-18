// api/debug-env.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    hasVisionKey: Boolean(process.env.GCLOUD_VISION_API_KEY || process.env.GOOGLE_CLOUD_VISION_API_KEY || process.env.GOOGLE_VISION_API_KEY),
    keysSeen: Object.keys(process.env).filter(k => /VISION/i.test(k)), // 어떤 이름들이 들어왔는지 확인
    env: process.env.VERCEL_ENV  // 'production' | 'preview' | 'development'
  })
}
