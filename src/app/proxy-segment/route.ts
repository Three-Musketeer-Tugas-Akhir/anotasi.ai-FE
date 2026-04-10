import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const videoUrl = searchParams.get('url'); // Expected: /assets/jobs/...
  const token = searchParams.get('token');

  if (!videoUrl || !token) {
    return new Response('Missing url or token', { status: 400 });
  }

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://152.118.31.36:8000/api/v1';
  // Ensure we strip any leading /api/v1 if the user passes it
  const cleanUrl = videoUrl.replace(/^\/api\/v1/, '');
  const backendUrl = `${apiBase}${cleanUrl.startsWith('/') ? cleanUrl : '/' + cleanUrl}`;

  const headers = new Headers();
  headers.set('Authorization', `Bearer ${token}`);

  const range = req.headers.get('range');
  if (range) {
    headers.set('range', range);
  }

  try {
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      return new Response(`Backend Error: ${response.status}`, { status: response.status });
    }

    const resHeaders = new Headers();
    const headersToForward = ['content-type', 'content-length', 'accept-ranges', 'content-range'];
    
    headersToForward.forEach((headerName) => {
      const val = response.headers.get(headerName);
      if (val) resHeaders.set(headerName, val);
    });

    return new Response(response.body, {
      status: response.status,
      headers: resHeaders,
    });
  } catch (error) {
    return new Response('Internal Server Error', { status: 500 });
  }
}
