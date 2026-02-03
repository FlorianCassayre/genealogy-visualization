import React, { useMemo, useState } from 'react';
import { FranceMapDepartmentImage } from '../components/FranceMapImage.tsx';
import { Box } from '@mui/joy';
import { Slider } from '@mui/material';
import { interpolateReds } from 'd3-scale-chromatic';
import { GeographyGenerationData } from '../scripts/types.ts';

interface GeographyGenerationVisualizationProps {
  data: GeographyGenerationData;
}

export const GeographyGenerationVisualization: React.FC<GeographyGenerationVisualizationProps> = ({ data }) => {
  const { generations } = data;
  const [min, max] = [0, generations.length - 1];

  const [generation, setGeneration] = useState(max);

  const marks = useMemo(
    () => Array.from({ length: max - min + 1 }, (_, i) => i + min).map((i) => ({ value: i, label: `${i + 1}` })),
    [min, max],
  );

  const highlighted = useMemo(() => {
    const { departments: counts } = generations[generation];
    const minColorScale = 0.15; // Otherwise it's barely visible
    const maxDistribution = Math.max(...counts.map(({ distribution }) => distribution));
    return Object.fromEntries(
      counts.map(({ place, distribution }) => [
        place[0],
        interpolateReds((distribution / maxDistribution) * (1 - minColorScale) + minColorScale),
      ]),
    );
  }, [generations, generation]);

  return (
    <Box>
      <Box sx={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}>
        <FranceMapDepartmentImage
          highlighted={highlighted}
          tooltip={(department) => {
            const count =
              generations[generation].departments
                .filter(({ place }) => place[0] === department)
                .map(({ count }) => count)[0] ?? 0;
            return `${count} individual${count !== 1 ? 's' : ''} born`;
          }}
        />
      </Box>
      <Box sx={{ px: 3, pt: 2 }}>
        <Slider
          step={1}
          min={min}
          max={max}
          valueLabelDisplay="off"
          marks={marks}
          track={false}
          onChange={(_, value) => setGeneration(value as number)}
          value={generation}
        />
      </Box>
    </Box>
  );
};
