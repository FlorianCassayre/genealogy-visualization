import React from 'react';
import { interpolateBuPu } from 'd3-scale-chromatic';
import { DiskVisualization, DiskVisualizationType } from './DiskVisualization';
import { ChildrenCountDiskData } from '../scripts/types';
import { Box, Stack } from '@mui/joy';

interface DiskChildrenCountVisualizationProps {
  data: ChildrenCountDiskData['tree'];
}

export const DiskChildrenCountVisualization: React.FC<DiskChildrenCountVisualizationProps> = ({ data }) => {
  return (
    <Box>
      <DiskVisualization
        data={data}
        color={interpolateBuPu}
        tooltip={(d) => (
          <Stack alignItems="center">
            <Box>Sosa {d.sosa}</Box>
            {d.children !== null && (
              <>
                {d.children} {d.children !== 1 ? 'children' : 'child'}
              </>
            )}
          </Stack>
        )}
        type={DiskVisualizationType.SCALE}
        scale={(d) => d.children}
      />
    </Box>
  );
};
