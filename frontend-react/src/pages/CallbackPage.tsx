import { useHandleSignInCallback } from '@logto/react';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export function CallbackPage() {
  const navigate = useNavigate();

  const { isLoading } = useHandleSignInCallback(() => {
    console.log('[CallbackPage] ✅ Sign-in callback complete');
    navigate('/');
  });

  useEffect(() => {
    console.log('[CallbackPage] isLoading:', isLoading);
  }, [isLoading]);

  if (isLoading) {
    return <div>Redirecting...</div>;
  }

  return null;
}
