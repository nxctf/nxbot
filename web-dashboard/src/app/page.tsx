import { redirect } from 'next/navigation';
import { isPlatformSetup } from '@/lib/auth';

export default function RootPage() {
  if (!isPlatformSetup()) {
    redirect('/setup');
  } else {
    redirect('/dashboard');
  }
}
