import pkg from '../../package.json' assert { type: 'json' };
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { INPUT_FILE, PUBLIC_DIRECTORY, TREE_DEPTH_LIMIT, TREE_DEPTH_SENSITIVE } from './config.ts';
import { readGedcom } from 'read-gedcom';
import { buildIndividualTree, getRootIndividual, treeDfs } from './utils.ts';
import * as _ from 'radash';
import { join } from 'path';

const COAT_OF_ARMS_DIRECTORY = join(PUBLIC_DIRECTORY, 'heraldry');

const getCoatOfArmsImageUrl = async (place: string): Promise<string | null> => {
  const labelLanguage = 'fr';
  const coatOfArmsProperty = 'P94';
  const sparqlQuery = `SELECT DISTINCT ?coa
     WHERE {
       ?cityItem rdfs:label "${place.replace('\\', '\\\\').replace('"', '\\"')}"@${labelLanguage}.
       ?cityItem wdt:${coatOfArmsProperty} ?coa.
     }
     LIMIT 1`;

  const result = await fetch('https://query.wikidata.org/sparql', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'User-Agent': `${pkg.name}/${pkg.version} (https://genealogy.florian.cassayre.me)`,
    },
    body: new URLSearchParams({
      query: sparqlQuery,
    }),
  });
  const resultJson = (await result.json()) as { results: { bindings: { coa: { type: string; value: string } }[] } };
  if (resultJson.results.bindings.length) {
    const binding = resultJson.results.bindings[0];
    if (binding.coa.type === 'uri') {
      return binding.coa.value;
    }
  }
  return null;
};

const extractPlaces = async () => {
  console.log('Loading file...');
  const buffer = readFileSync(INPUT_FILE);
  console.log('Reading Gedcom...');
  const gedcom = readGedcom(buffer);
  const root = getRootIndividual(gedcom);
  const tree = buildIndividualTree(
    root,
    (node, depth) => {
      const parts = node.getEventBirth().getPlace().valueAsParts()[0];
      const place =
        parts != null
          ? _.list(3 - 1)
              .reverse()
              .map((i) => (i !== 2 || depth >= TREE_DEPTH_SENSITIVE ? parts[parts.length - 1 - i] || null : null))
          : null;
      return {
        place,
      };
    },
    TREE_DEPTH_LIMIT,
  );
  const sets: Record<number, Set<string>> = {};
  treeDfs(tree, (node) => {
    if (node.data.place) {
      for (let i = 0; i < node.data.place.length; i++) {
        const place = node.data.place[i];
        // Filter out places that start with numbers
        if (place && (place.charAt(0) < '0' || place.charAt(0) > '9')) {
          sets[i] ??= new Set();
          sets[i].add(place);
        }
      }
    }
  });
  const directories = ['city', 'department', 'country'];
  const allPlaces: Record<string, string[]> = {};
  for (let i = 0; i < directories.length; i++) {
    const directory = directories[i];
    if (sets[i] !== undefined) {
      const set = sets[i];
      allPlaces[directory] = [...set].sort();
    }
  }
  return allPlaces;
};

const CONCURRENT_REQUEST_LIMIT = 8;

const processPlace = async (task: { place: string; placeDirectory: string }) => {
  const { place, placeDirectory } = task;
  console.log(`[${place}] Fetching coat of arms...`);
  try {
    const url = await getCoatOfArmsImageUrl(place);
    const extension = '.svg';
    if (url !== null) {
      if (url.endsWith(extension)) {
        console.log(`[${place}] SVG found, downloading...`);
        const fileResponse = await fetch(url);
        if (!fileResponse.ok) {
          throw new Error(`Failed to download ${url}: ${fileResponse.statusText}`);
        }
        const buffer = await fileResponse.arrayBuffer();
        writeFileSync(join(placeDirectory, `${place}.svg`), new Uint8Array(buffer));
        console.log(`[${place}] Saved successfully.`);
      } else {
        console.warn(`[${place}] Unrecognized extension: ${url}`);
      }
    } else {
      console.log(`[${place}] No coat of arms found.`);
    }
  } catch (error) {
    console.error(`[${place}] An error occurred:`, error);
  }
};

const downloadAllCoatOfArms = async () => {
  const allPlaces = await extractPlaces();
  console.log('\nPreparing all tasks for parallel download...');
  const tasks: { place: string; placeDirectory: string }[] = [];
  for (const [directory, places] of Object.entries(allPlaces)) {
    const placeDirectory = join(COAT_OF_ARMS_DIRECTORY, directory);
    mkdirSync(placeDirectory, { recursive: true });
    for (const place of places) {
      tasks.push({ place, placeDirectory });
    }
  }
  console.log(`Found ${tasks.length} unique places to process.`);
  console.log(`Starting download with a concurrency of ${CONCURRENT_REQUEST_LIMIT}...\n`);
  await _.parallel(CONCURRENT_REQUEST_LIMIT, tasks, processPlace);
  console.log('\nAll coat of arms processed successfully!');
};

void downloadAllCoatOfArms();
