import { useDataQuery } from './hooks/useDataQuery.ts';

export const Homepage = () => {
  const { data } = useDataQuery('data');
  return <>{JSON.stringify(data)}</>;
};
