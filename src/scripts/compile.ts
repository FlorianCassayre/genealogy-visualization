import { readGedcom, SelectionEvent, SelectionGedcom, SelectionIndividualRecord, toJsDate } from 'read-gedcom';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  ChildrenCountDiskData,
  CompletenessDiskData,
  Data,
  EventCompleteness,
  GenealogyData,
  GeographyDiskData,
  GeographyGenerationData,
  LongevityDiskData,
} from './types';
import * as _ from 'radash';
import { buildIndividualTree, getRootIndividual } from './utils.ts';
import { INPUT_FILE, OUTPUT_DIRECTORY, TREE_DEPTH_LIMIT, TREE_DEPTH_SENSITIVE } from './config.ts';

const targetGenealogyData = (gedcom: SelectionGedcom): GenealogyData => ({
  count: gedcom.getIndividualRecord().array().length,
});

const birthPlaceDataForIndividual = (
  node: SelectionIndividualRecord,
  depth: number,
): GeographyDiskData['tree']['data'] => {
  const parts = node.getEventBirth().getPlace().valueAsParts()[0];
  const place =
    parts != null
      ? _.list(3 - 1)
          .reverse()
          .map((i) => (i !== 2 || depth >= TREE_DEPTH_SENSITIVE ? parts[parts.length - 1 - i] || null : null))
      : null;
  return { place };
};

const targetGeographyDisk = (gedcom: SelectionGedcom): GeographyDiskData => {
  const root = getRootIndividual(gedcom);
  return {
    tree: buildIndividualTree(root, birthPlaceDataForIndividual, TREE_DEPTH_LIMIT),
  };
};

const targetLongevityDisk = (gedcom: SelectionGedcom): LongevityDiskData => {
  const root = getRootIndividual(gedcom);
  const dataForIndividual = (node: SelectionIndividualRecord): LongevityDiskData['tree']['data'] => {
    const dateForEvent = (event: SelectionEvent): Date | null => {
      const dateValue = event.getDate().valueAsDate()[0];
      return dateValue != null && dateValue.hasDate && dateValue.isDatePunctual ? toJsDate(dateValue.date) : null;
    };
    const birth = dateForEvent(node.getEventBirth()),
      death = dateForEvent(node.getEventDeath());
    // Not the best rounding, but good enough
    const longevity = birth !== null && death !== null ? death.getFullYear() - birth.getFullYear() : null;
    return { longevity };
  };
  return {
    tree: buildIndividualTree(root, dataForIndividual, TREE_DEPTH_LIMIT),
  };
};

const targetCompletenessDisk = (gedcom: SelectionGedcom): CompletenessDiskData => {
  const root = getRootIndividual(gedcom);
  const dataForIndividual = (
    node: SelectionIndividualRecord,
    depth: number,
    child: SelectionIndividualRecord | null,
  ): CompletenessDiskData['tree']['data'] => {
    const completenessForEvent = (event: SelectionEvent): EventCompleteness => {
      const dateValue = event.getDate().valueAsDate()[0];
      const date = dateValue != null && dateValue.hasDate && dateValue.isDatePunctual && !dateValue.isDateApproximated;
      const place = (event.getPlace().valueAsParts()[0]?.length ?? 0) >= 3;
      return { date, place };
    };
    const birth = completenessForEvent(node.getEventBirth()),
      death = completenessForEvent(node.getEventDeath()),
      marriage = completenessForEvent(
        node
          .getFamilyAsSpouse()
          .filterSelect((f) =>
            f
              .getChild()
              .getIndividualRecord()
              .pointer()
              .some((p) => p === child?.pointer()?.[0]),
          )
          .getEventMarriage(),
      );
    return { events: depth >= TREE_DEPTH_SENSITIVE ? { birth, marriage, death } : null };
  };
  return {
    tree: buildIndividualTree(root, dataForIndividual, TREE_DEPTH_LIMIT),
  };
};

const targetChildrenCountDisk = (gedcom: SelectionGedcom): ChildrenCountDiskData => {
  const root = getRootIndividual(gedcom);
  return {
    tree: buildIndividualTree(
      root,
      (node, depth) => ({
        children: depth >= TREE_DEPTH_SENSITIVE ? node.getFamilyAsSpouse().getChild().length : null,
      }),
      TREE_DEPTH_LIMIT,
    ),
  };
};

const targetGeographyGenerationDisk = (gedcom: SelectionGedcom): GeographyGenerationData => {
  const root = getRootIndividual(gedcom);
  const tree = buildIndividualTree(root, birthPlaceDataForIndividual, TREE_DEPTH_LIMIT);
  const generations: GeographyGenerationData['generations'] = [];

  let queue: (typeof tree)[] = [tree];
  const france = 'France';
  const placeLength = 3;
  const departmentLength = 2;
  while (queue.length > 0 && generations.length < TREE_DEPTH_LIMIT) {
    const places = queue
      .map(({ data: { place } }) => place)
      .filter((place): place is (string | null)[] => place !== null)
      .map((place) => place.slice(placeLength - departmentLength, placeLength))
      .filter(
        (place): place is [string, string] =>
          place.length === departmentLength && place[1] === france && place.every((v) => v !== null),
      );
    const counts: Record<string, { place: [string, string]; count: number }> = {};
    places.forEach((place) => {
      const key = JSON.stringify(place);
      if (counts[key] === undefined) {
        counts[key] = { place, count: 0 };
      }
      counts[key].count++;
    });
    generations.push({
      departments: Object.values(counts)
        .sort(({ count: a }, { count: b }) => a - b)
        .map(({ count, ...rest }) => ({ distribution: count / places.length, count, ...rest })),
    });

    queue = queue.flatMap((person) => [person.father, person.mother].filter((v): v is typeof tree => v !== undefined));
  }

  return { generations };
};

const targets = (gedcom: SelectionGedcom): Data => ({
  data: targetGenealogyData(gedcom),
  geographyDisk: targetGeographyDisk(gedcom),
  longevityDisk: targetLongevityDisk(gedcom),
  completenessDisk: targetCompletenessDisk(gedcom),
  childrenCountDisk: targetChildrenCountDisk(gedcom),
  geographyGeneration: targetGeographyGenerationDisk(gedcom),
});

const generateTargets = () => {
  console.log('Loading file...');
  const { buffer } = readFileSync(INPUT_FILE);
  console.log('Reading Gedcom...');
  const gedcom = readGedcom(buffer);
  console.log('Generating targets...');
  const allTarget = targets(gedcom);
  console.log('Writing targets...');
  _.alphabetical(Object.entries(allTarget), ([name]) => name).forEach(([name, target]) => {
    const filename = `${name}.json`;
    console.log(`  Writing ${filename}...`);
    writeFileSync(join(OUTPUT_DIRECTORY, filename), JSON.stringify(target));
  });
  console.log('Done');
};

void generateTargets();
