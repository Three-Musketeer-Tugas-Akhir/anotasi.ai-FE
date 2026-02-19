import { redirect } from 'next/navigation';

/**
 * Root page — redirects to the classification workflow.
 * In the future, this will become the main dashboard.
 */
export default function HomePage() {
  redirect('/classification');
}
