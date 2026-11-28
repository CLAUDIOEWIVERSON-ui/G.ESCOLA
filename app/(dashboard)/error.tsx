'use client';

import { useEffect } from 'react';
import { useUser } from '@/lib/auth/UserContext';
import { PageReloadPrompt } from '@/components/PageReloadPrompt';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { profile, isAluno } = useUser();
  const isStudentUser = isAluno || profile?.role === 'aluno' || Boolean(profile?.isNifStudent);

  useEffect(() => {
    console.error('[DashboardError]', error);
  }, [error]);

  return (
    <PageReloadPrompt
      isStudentUser={isStudentUser}
      onRetry={reset}
    />
  );
}
