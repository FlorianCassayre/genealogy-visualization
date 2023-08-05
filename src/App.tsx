import { QueryClient, QueryClientProvider } from 'react-query';
import { Homepage } from './Homepage.tsx';
import '@fontsource/inter';
import { Layout } from './Layout.tsx';

export const App = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        cacheTime: Infinity,
        staleTime: Infinity, // Technically this is the only parameter that we need to override
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <Layout>
        <Homepage />
      </Layout>
    </QueryClientProvider>
  );
};
