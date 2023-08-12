import React from 'react';
import { interpolateRdYlGn } from 'd3-scale-chromatic';
import { DiskVisualization, DiskVisualizationType } from './DiskVisualization';
import { CompletenessDiskData } from '../scripts/types';
import { Box, Stack } from '@mui/joy';

interface DiskCompletenessVisualizationProps {
  data: CompletenessDiskData['tree'];
}

export const DiskCompletenessVisualization: React.FC<DiskCompletenessVisualizationProps> = ({ data }) => {
  return (
    <Box>
      <DiskVisualization
        data={data}
        color={interpolateRdYlGn}
        tooltip={(d) => (
          <Stack alignItems="center">
            <Box>Sosa {d.sosa}</Box>
            {d.events !== null &&
              [
                { name: 'birth', value: d.events.birth },
                { name: 'marriage', value: d.events.marriage },
                { name: 'death', value: d.events.death },
              ]
                .flatMap(({ name, value }) => [
                  { name: `${name} date`, value: value.date },
                  { name: `${name} place`, value: value.place },
                ])
                .filter(({ value }) => !value)
                .map(({ name }, i) => <Box key={i}>Missing {name}</Box>)}
          </Stack>
        )}
        type={DiskVisualizationType.SCALE}
        scale={(d) =>
          d.events !== null
            ? [d.events.birth, d.events.marriage, d.events.death].filter((e) => e.date && e.place).length
            : null
        }
      />
    </Box>
  );
};
