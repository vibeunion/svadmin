export function GET() {
  return Response.json({ engine: 'server', status: 'ready', result: 'example-output' });
}
