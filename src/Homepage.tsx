import { useDataQuery } from './hooks/useDataQuery.ts';
import { DiskVisualization } from './viz/DiskVisualization.tsx';

export const Homepage = () => {
  const { data } = useDataQuery('geographyDisk');
  return data ? (
    <>
      <DiskVisualization data={data.tree} />
    </>
  ) : null;
};
