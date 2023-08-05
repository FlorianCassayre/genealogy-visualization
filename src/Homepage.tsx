import { useDataQuery } from './hooks/useDataQuery.ts';
import { DiskVisualization } from './viz/DiskVisualization.tsx';
import { Box, Grid, Typography } from '@mui/joy';

export const Homepage = () => {
  const { data } = useDataQuery('geographyDisk');
  return data ? (
    <Box>
      <Grid container justifyContent="center">
        <Grid xs={12} sm={10} md={8} lg={7} xl={6}>
          <Typography level="h3" color="neutral" textAlign="center" sx={{ mb: 3 }}>
            Place of birth
          </Typography>
          <DiskVisualization data={data.tree} />
        </Grid>
      </Grid>
    </Box>
  ) : null;
};
