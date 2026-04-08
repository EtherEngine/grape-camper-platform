import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import ErrorBoundary from '../components/common/ErrorBoundary';
import useAuthStore from '../features/auth/AuthStore';

function AuthInit({ children }) {
  const init = useAuthStore((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  return children;
}

export default function Providers({ children }) {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthInit>
          {children}
        </AuthInit>
      </BrowserRouter>
    </ErrorBoundary>
  );
}