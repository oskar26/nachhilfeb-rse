export default async () => new Response(
  JSON.stringify({ ok: false, error: 'Die KI-Generierung ist nicht mehr verfügbar.' }),
  {
    status: 410,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  }
);

export const config = {
  path: '/api/ai/generate',
};
