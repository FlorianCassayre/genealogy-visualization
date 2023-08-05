import React, { useCallback, useMemo } from 'react';
import { SimpleIndividualTree } from '../scripts/types';
import * as _ from 'radash';
import { interpolateSinebow } from 'd3-scale-chromatic';

interface DiskVisualizationProps {
  data: SimpleIndividualTree;
}

export const DiskVisualization: React.FC<DiskVisualizationProps> = ({ data }) => {
  const radius = 50;
  const initialAngle = Math.PI / 2;
  const strokeWidth = 1;
  type TreeState = Omit<DiskTreeLayoutProps, 'data' | 'radius' | 'color' | 'strokeWidth'>;
  const generateLayout = useCallback(
    (
      node: SimpleIndividualTree,
      state: TreeState,
    ): (Omit<DiskTreeLayoutProps, 'color'> & SimpleIndividualTree['data'])[] => {
      const { startAngle, endAngle, distance } = state;
      const midAngle = (startAngle + endAngle) / 2;
      const recursive = [
        { node: node.father, startAngle: startAngle, endAngle: midAngle },
        { node: node.mother, startAngle: midAngle, endAngle: endAngle },
      ]
        .filter(({ node: parent }) => parent !== undefined)
        .flatMap(({ node: parent, ...specificData }) =>
          generateLayout(parent!, { ...specificData, root: false, distance: distance + radius }),
        );
      return [{ ...state, radius, strokeWidth, place: node.data.place }].concat(recursive);
    },
    [radius, strokeWidth],
  );
  const layout = useMemo(
    () =>
      generateLayout(data, { root: true, startAngle: initialAngle, endAngle: initialAngle + 2 * Math.PI, distance: 0 }),
    [data, generateLayout, initialAngle],
  );
  const interpolate = interpolateSinebow;
  const uniquePlaces = _.unique(layout.map((a) => a.place)).sort();
  const colors = _.objectify(
    uniquePlaces.map((v, i) => [v, i] as const),
    ([key]) => key,
    ([key, i]) => key ? interpolate(uniquePlaces.length > 1 ? i / (uniquePlaces.length - 1) : 0) : 'white',
  );
  const maxDistance = _.max(layout.map((p) => p.distance))! + radius;
  const size = (maxDistance + strokeWidth) * 2;
  return (
    <svg width={size} height={size}>
      <g transform={`translate(${size / 2}, ${size / 2})`}>
        {layout.map(({ place, ...props }, i) => (
          <DiskTreeLayout key={i} {...props} color={colors[place]} />
        ))}
      </g>
    </svg>
  );
};

interface DiskTreeLayoutProps {
  root?: boolean;
  startAngle: number;
  endAngle: number;
  distance: number;
  radius: number;
  color: string;
  strokeWidth: number;
}

const DiskTreeLayout: React.FC<DiskTreeLayoutProps> = ({
  root,
  startAngle,
  endAngle,
  distance,
  radius,
  color,
  strokeWidth,
}) => {
  const move = ({ x, y }: Record<'x' | 'y', number>) => ['M', x, y];
  const line = ({ x, y }: Record<'x' | 'y', number>) => ['L', x, y];
  const arc = ({ r, x, y, o }: Record<'r' | 'x' | 'y', number> & { o: boolean }) => ['A', r, r, 0, 0, o ? 1 : 0, x, y];

  if (root) {
    return <circle cx={0} cy={0} r={radius} stroke={color} strokeWidth={strokeWidth} fill={color} />;
  }

  const cosStartAngle = Math.cos(startAngle),
    sinStartAngle = Math.sin(startAngle);
  const cosEndAngle = Math.cos(endAngle),
    sinEndAngle = Math.sin(endAngle);
  const distanceOffset = distance + radius;
  const x00 = distance * cosStartAngle,
    y00 = distance * sinStartAngle;
  const x10 = distance * cosEndAngle,
    y10 = distance * sinEndAngle;
  const x01 = distanceOffset * cosStartAngle,
    y01 = distanceOffset * sinStartAngle;
  const x11 = distanceOffset * cosEndAngle,
    y11 = distanceOffset * sinEndAngle;

  return (
    <path
      d={[
        move({ x: x00, y: y00 }),
        arc({ r: distance, x: x10, y: y10, o: true }),
        line({ x: x11, y: y11 }),
        arc({ r: distanceOffset, x: x01, y: y01, o: false }),
        line({ x: x00, y: y00 }),
      ]
        .flat()
        .join(' ')}
      stroke={color}
      strokeWidth={strokeWidth}
      fill={color}
    />
  );
};
