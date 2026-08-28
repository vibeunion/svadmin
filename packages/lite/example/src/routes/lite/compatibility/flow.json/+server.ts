import { json } from '@sveltejs/kit';

export function GET() {
  return json({
    nodes: [
      { id: 'start', label: 'Start' },
      { id: 'review', label: 'Review' },
      { id: 'approved', label: 'Approved' },
    ],
    edges: [
      { source: 'start', target: 'review' },
      { source: 'review', target: 'approved' },
    ],
  });
}
