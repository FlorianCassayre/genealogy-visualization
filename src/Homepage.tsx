import { useDataQuery } from './hooks/useDataQuery.ts';
import { Box, Grid, Typography } from '@mui/joy';
import { DiskGeographyVisualization } from './viz/DiskGeographyVisualization.tsx';
import { DiskLongevityVisualization } from './viz/DiskLongevityVisualization.tsx';

export const Homepage = () => {
  const { data } = useDataQuery('geographyDisk');
  const { data: dataLongevity } = useDataQuery('longevityDisk');
  return data && dataLongevity ? (
    <Box>
      <Grid container justifyContent="center" spacing={2}>
        <Grid xs={12} sm={10} md={8} lg={7} xl={6}>
          <Typography level="h3" color="neutral" textAlign="center" sx={{ mt: 2, mb: 3 }}>
            Location
          </Typography>
          <DiskGeographyVisualization data={data.tree} />
        </Grid>
        <Grid xs={12} sm={10} md={8} lg={7} xl={6}>
          <Typography level="h3" color="neutral" textAlign="center" sx={{ mt: 2, mb: 3 }}>
            Longevity
          </Typography>
          <DiskLongevityVisualization data={dataLongevity.tree} />
        </Grid>
      </Grid>
    </Box>
  ) : null;
};
