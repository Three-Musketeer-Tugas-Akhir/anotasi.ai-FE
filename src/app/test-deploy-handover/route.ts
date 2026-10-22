// Smoke-test endpoint for verifying automatic Vercel deploys from GitHub.
export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json({
    status: 'ok',
    message: 'test-deploy-handover is live',
    timestamp: new Date().toISOString(),
    vercelEnv: process.env.VERCEL_ENV ?? 'local',
    commitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    commitRef: process.env.VERCEL_GIT_COMMIT_REF ?? null,
  });
}
