/* eslint-disable no-unused-vars */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { IndividualTree } from '../scripts/types';
import * as _ from 'radash';
import { Tooltip } from '@mui/joy';

type ExtendedData<D> = D & { sosa: number };

// eslint-disable-next-line react-refresh/only-export-components
export enum DiskVisualizationType {
  CATEGORY,
  SCALE,
}

type DiskVisualizationProps<D> = {
  data: IndividualTree<D>;
  color: (value: number) => string;
  tooltip: (node: ExtendedData<D>) => React.ReactNode;
} & (
  | {
      type: DiskVisualizationType.CATEGORY;
      category: (node: ExtendedData<D>) => string | null;
    }
  | {
      type: DiskVisualizationType.SCALE;
      scale: (node: ExtendedData<D>) => number | null;
    }
);

export const DiskVisualization = <D,>(props: DiskVisualizationProps<D>): React.ReactElement => {
  const { data, color, tooltip } = props;

  const hoveredDataRef = useRef<ExtendedData<D> | null>();
  const [hoveredData, setHoveredData] = useState<ExtendedData<D> | null>(null);
  const handleEnter = useCallback(
    (key: ExtendedData<D>) => {
      hoveredDataRef.current = key;
      setHoveredData(key);
    },
    [hoveredDataRef, setHoveredData],
  );
  const handleLeave = useCallback(
    (key: ExtendedData<D>) => {
      if (
        (hoveredData !== null && hoveredData.sosa === key.sosa) ||
        (hoveredDataRef.current != null && hoveredDataRef.current.sosa === key.sosa)
      ) {
        hoveredDataRef.current = null;
        setHoveredData(null);
      }
    },
    [hoveredDataRef, hoveredData, setHoveredData],
  );

  const radius = 50;
  const initialAngle = Math.PI / 2;
  const strokeWidth = 1;
  type TreeState = Omit<
    DiskTreeLayoutProps,
    'root' | 'data' | 'radius' | 'color' | 'strokeWidth' | 'onEnter' | 'onLeave'
  > & { sosa: number };
  const generateLayout = useCallback(
    (node: IndividualTree<D>, state: TreeState): (Omit<DiskTreeLayoutProps, 'color'> & { data: ExtendedData<D> })[] => {
      const { startAngle, endAngle, distance } = state;
      const { sosa, ...filteredState } = state;
      const midAngle = (startAngle + endAngle) / 2;
      const recursive = [
        { node: node.father, startAngle: startAngle, endAngle: midAngle, sosa: sosa * 2 },
        { node: node.mother, startAngle: midAngle, endAngle: endAngle, sosa: sosa * 2 + 1 },
      ]
        .filter(({ node: parent }) => parent !== undefined)
        .flatMap(({ node: parent, ...specificData }) =>
          generateLayout(parent!, { ...specificData, distance: distance + radius }),
        );
      const extendedData = { ...node.data, sosa };
      return [
        {
          ...filteredState,
          root: sosa === 1,
          radius,
          strokeWidth,
          data: extendedData,
          onEnter: () => handleEnter(extendedData),
          onLeave: () => handleLeave(extendedData),
        },
      ].concat(recursive);
    },
    [radius, strokeWidth, handleEnter, handleLeave],
  );

  const layout = useMemo(
    () =>
      generateLayout(data, { sosa: 1, startAngle: initialAngle, endAngle: initialAngle + 2 * Math.PI, distance: 0 }),
    [data, generateLayout, initialAngle],
  );
  const maxDistance = _.max(layout.map((p) => p.distance))! + radius;
  const size = (maxDistance + strokeWidth) * 2;

  const defaultColor = 'white';

  const colorForData = useMemo(() => {
    switch (props.type) {
      case DiskVisualizationType.CATEGORY: {
        const uniqueCategories = _.unique(layout.map((p) => props.category(p.data))).sort();
        const colorForCategory = _.objectify(
          uniqueCategories.filter((v) => v !== null).map((v, i) => [v!, i] as const),
          ([key]) => key,
          ([, i]) => color(uniqueCategories.length > 1 ? i / (uniqueCategories.length - 1) : 0),
        );
        return (data: ExtendedData<D>) => {
          const key = props.category(data);
          return key !== null ? colorForCategory[key] : defaultColor;
        };
      }
      case DiskVisualizationType.SCALE: {
        const values = layout.map((p) => props.scale(p.data)).filter((v): v is number => v !== null);
        const min = _.min(values),
          max = _.max(values);
        return (d: ExtendedData<D>) => {
          const scale = props.scale(d);
          return scale !== null ? color(min !== null && max !== null ? (scale - min) / (max - min) : 0) : defaultColor;
        };
      }
    }
  }, [props, layout, color]);

  const grouped = useMemo(() => {
    switch (props.type) {
      case DiskVisualizationType.CATEGORY:
        return [layout.filter((p) => props.category(p.data) === null)].concat(
          Object.values(
            _.group(
              layout.filter((p) => props.category(p.data) !== null),
              (p) => props.category(p.data)!,
            ),
          ).map((allProps) => allProps!),
        );
      case DiskVisualizationType.SCALE:
        return layout.map((l) => [l]);
    }
  }, [props, layout]);

  return (
    <Tooltip title={hoveredData !== null ? tooltip(hoveredData) : null} followCursor>
      <svg viewBox={[0, 0, size, size].join(' ')}>
        <g transform={`translate(${size / 2}, ${size / 2})`}>
          {grouped.map((allProps, i) => (
            <DiskTreeLayoutGroup
              key={i}
              focused={hoveredData === null ? undefined : allProps.some((p) => p.data.sosa === hoveredData.sosa)}
            >
              {allProps!.map(({ data, ...props }, i) => (
                <DiskTreeLayout key={i} {...props} color={colorForData(data)} />
              ))}
            </DiskTreeLayoutGroup>
          ))}
        </g>
      </svg>
    </Tooltip>
  );
};

interface DiskTreeLayoutGroupProps {
  focused?: boolean;
  children: React.ReactNode;
}

const DiskTreeLayoutGroup: React.FC<DiskTreeLayoutGroupProps> = ({ focused, children }) => {
  return (
    <g
      opacity={focused !== false ? undefined : 0.25}
      style={{
        transition: 'opacity 0.5s, filter 0.5s',
        filter: focused !== false ? undefined : 'grayscale(100%)',
        cursor: 'help',
      }}
    >
      {children}
    </g>
  );
};

interface DiskTreeLayoutProps {
  root: boolean;
  startAngle: number;
  endAngle: number;
  distance: number;
  radius: number;
  color: string;
  strokeWidth: number;
  onEnter: () => void;
  onLeave: () => void;
}

const DiskTreeLayout: React.FC<DiskTreeLayoutProps> = ({
  root,
  startAngle,
  endAngle,
  distance,
  radius,
  color,
  strokeWidth,
  onEnter,
  onLeave,
}) => {
  const move = ({ x, y }: Record<'x' | 'y', number>) => ['M', x, y];
  const line = ({ x, y }: Record<'x' | 'y', number>) => ['L', x, y];
  const arc = ({ r, x, y, o }: Record<'r' | 'x' | 'y', number> & { o: boolean }) => ['A', r, r, 0, 0, o ? 1 : 0, x, y];

  if (root) {
    return (
      <circle
        cx={0}
        cy={0}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill={color}
        onMouseEnter={() => onEnter()}
        onMouseLeave={() => onLeave()}
      />
    );
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
      onMouseEnter={() => onEnter()}
      onMouseLeave={() => onLeave()}
    />
  );
};
