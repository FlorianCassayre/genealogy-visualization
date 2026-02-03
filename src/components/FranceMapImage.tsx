import React from 'react';
import { SvgMap } from '../types/SvgMap.ts';
import svgFranceDepartments from '@svg-maps/france.departments';
import { Box, Tooltip } from '@mui/joy';

interface FranceMapImageProps {
  source: SvgMap;
  highlighted?: Record<string, string>;
  tooltip?: (place: string) => React.ReactNode;
  nameMapping?: Record<string, string>;
}

export const FranceMapImage: React.FC<FranceMapImageProps> = ({
  source,
  highlighted = {},
  tooltip,
  nameMapping = {},
}) => {
  return (
    <svg viewBox={source.viewBox}>
      {source.locations.map(({ name, id, path }) => {
        const actualName = nameMapping[name] ?? name;
        const highlightColor = highlighted[actualName];
        const fill = highlightColor ?? 'white';
        return (
          <Tooltip
            title={
              <>
                <Box>{actualName}</Box>
                {tooltip && <Box>{tooltip(actualName)}</Box>}
              </>
            }
          >
            <path key={id} d={path} fill={fill} stroke="black" style={{ cursor: 'help' }} />
          </Tooltip>
        );
      })}
    </svg>
  );
};

export const FranceMapDepartmentImage: React.FC<Omit<FranceMapImageProps, 'source'>> = (props) => {
  return <FranceMapImage source={svgFranceDepartments} nameMapping={{ 'Ville de Paris': 'Paris' }} {...props} />;
};
