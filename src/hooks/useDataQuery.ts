import { useQuery } from '@tanstack/react-query';
import type { Data } from '../scripts/types';

export const useDataQuery = <K extends keyof Data & string>(name: K) =>
  useQuery({
    queryKey: [name],
    queryFn: (): Promise<Data[K]> => fetch(`/data/${name}.json`).then((r) => r.json()),
  });
