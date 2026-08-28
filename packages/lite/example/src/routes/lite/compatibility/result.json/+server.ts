import { json } from '@sveltejs/kit';

export function GET() {
  return json({ engine: 'server', status: 'ready', result: 'example-output' });
}
