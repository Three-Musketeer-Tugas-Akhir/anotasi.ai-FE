import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get('jobId');
  const token = searchParams.get('token');

  if (!jobId || !token) {
    return new Response('Missing jobId or token', { status: 400 });
  }

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://152.118.31.36:8000/api/v1';
  const backendUrl = `${apiBase}/pipeline/jobs/${jobId}/original`;

  const headers = new Headers();
  headers.set('Authorization', `Bearer ${token}`);

  // Forward range request if present for video streaming/skipping
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

    // Pass necessary headers to browser to support streaming
    const resHeaders = new Headers();
    const headersToForward = [
      'content-type',
      'content-length',
      'accept-ranges',
      'content-range'
    ];

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
