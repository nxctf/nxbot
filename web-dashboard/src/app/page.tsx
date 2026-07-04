import { redirect } from 'next/navigation';
import { isPlatformSetup } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default function RootPage() {
  if (!isPlatformSetup()) {
    redirect('/setup');
  } else {
    redirect('/dashboard');
  }
}
