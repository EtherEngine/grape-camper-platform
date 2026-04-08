import Providers from './app/providers';
import AppRouter from './router';
import ToastContainer from './components/common/Toast';
import Loader from './components/common/Loader';
import useUiStore from './store/uiStore';

function GlobalLoading() {
  const active = useUiStore((s) => s.globalLoading);
  const text = useUiStore((s) => s.globalLoadingText);
  if (!active) return null;
  return <Loader overlay size="lg" text={text} />;
}

export default function App() {
  return (
    <Providers>
      <AppRouter />
      <ToastContainer />
      <GlobalLoading />
    </Providers>
  );
}