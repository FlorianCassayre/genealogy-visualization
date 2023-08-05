import { readGedcom, SelectionGedcom, SelectionIndividualRecord } from 'read-gedcom';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Data, GenealogyData, GeographyDiskData, SimpleIndividualTree } from './types';
import * as _ from 'radash';

const INPUT_FILE = 'genealogy.ged';
const OUTPUT_DIRECTORY = 'public/data';

const targetGenealogyData = (gedcom: SelectionGedcom): GenealogyData => ({
  count: gedcom.getIndividualRecord().array().length,
});

const targetGeographyDisk = (gedcom: SelectionGedcom): GeographyDiskData => {
  const limit = 9;
  const root = gedcom.getIndividualRecord().arraySelect()[0];
  const dataFromIndividual = (node: SelectionIndividualRecord): SimpleIndividualTree['data'] => {
    const parts = node.getEventBirth().getPlace().valueAsParts()[0];
    const head = 2;
    const place = parts != null ? parts.slice(parts.length - head).join(', ') : '';
    return { place };
  };
  const visit = (individual: SelectionIndividualRecord, depth: number): SimpleIndividualTree => {
    const family = individual.getFamilyAsChild();
    const husband = family.getHusband().getIndividualRecord().arraySelect()[0];
    const wife = family.getWife().getIndividualRecord().arraySelect()[0];
    const newDepth = depth + 1;
    return {
      ...(depth < limit - 1
        ? {
            father: husband ? visit(husband, newDepth) : undefined,
            mother: wife ? visit(wife, newDepth) : undefined,
          }
        : {}),
      data: dataFromIndividual(individual),
    };
  };
  return {
    tree: visit(root, 0),
  };
};

const targets = (gedcom: SelectionGedcom): Data => ({
  data: targetGenealogyData(gedcom),
  geographyDisk: targetGeographyDisk(gedcom),
});

const generateTargets = () => {
  console.log('Loading file...');
  const buffer = readFileSync(INPUT_FILE);
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
