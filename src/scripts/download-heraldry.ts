import pkg from '../../package.json' assert { type: 'json' };
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { INPUT_FILE, PUBLIC_DIRECTORY, TREE_DEPTH_LIMIT, TREE_DEPTH_SENSITIVE } from './config.ts';
import { readGedcom } from 'read-gedcom';
import { buildIndividualTree, getRootIndividual, treeDfs } from './utils.ts';
import * as _ from 'radash';
import { join } from 'path';

enum GeographicDivision {
  // Order matters!
  // eslint-disable-next-line no-unused-vars
  City,
  // eslint-disable-next-line no-unused-vars
  Department,
  // eslint-disable-next-line no-unused-vars
  Country,
}

const GeographicDivisions = Object.values(GeographicDivision) as GeographicDivision[];

const COAT_OF_ARMS_DIRECTORY = join(PUBLIC_DIRECTORY, 'heraldry');

const getCoatOfArmsImageUrl = async (place: { place: string; type: GeographicDivision }[]): Promise<string | null> => {
  const places = place.map(({ place }) => place);
  const placeType = place[0].type;
  const escapeSparql = (str: string) => str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const labelLanguage = 'fr';
  const instanceOfProperty = 'P31';
  const subclassOfProperty = 'P279';
  const countryProperty = 'P17';
  const locatedInAdminTerritoryProperty = 'P131';
  const coatOfArmsProperty = 'P94';
  const countryItem = 'Q6256';
  const municipalityItem = 'Q15284';
  const division1Item = 'Q10864048';
  const division2Item = 'Q13220204';
  const division3Item = 'Q13221722';
  const sparqlQuery = `SELECT DISTINCT ?coa WHERE {
  ?placeItem rdfs:label "${escapeSparql(places[0])}"@${labelLanguage}.
  ?placeItem wdt:${coatOfArmsProperty} ?coa.
  ${
    placeType === GeographicDivision.City
      ? `
    ?country rdfs:label "${escapeSparql(places[2])}"@${labelLanguage}; wdt:${instanceOfProperty} wd:${countryItem}.
    ?division rdfs:label "${escapeSparql(places[1])}"@${labelLanguage}; (wdt:${locatedInAdminTerritoryProperty}*/wdt:${countryProperty}) ?country.
    ?placeItem wdt:${locatedInAdminTerritoryProperty}* ?division.
    ?placeItem wdt:${instanceOfProperty}/wdt:${subclassOfProperty}* wd:${municipalityItem}.`
      : ''
  }
  ${
    placeType === GeographicDivision.Department
      ? `
    ?country rdfs:label "${escapeSparql(places[1])}"@${labelLanguage}; wdt:${instanceOfProperty} wd:${countryItem}.
    VALUES ?type { wd:${division1Item} wd:${division2Item} wd:${division3Item} }
    ?placeItem wdt:${instanceOfProperty}/wdt:${subclassOfProperty}* ?type.`
      : ''
  }
  ${
    placeType === GeographicDivision.Country
      ? `
    ?placeItem wdt:${instanceOfProperty} wd:${countryItem}.`
      : ''
  }
  } LIMIT 1`;

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
  const places: Record<string, { place: string; type: GeographicDivision }[]> = {};
  treeDfs(tree, (node) => {
    const { place } = node.data;
    if (place) {
      const cappedPlaces = place.slice(Math.max(place.length - GeographicDivisions.length, 0), place.length);
      const labelledPlaces = cappedPlaces.map((place, i) => ({
        place,
        type: GeographicDivisions[i + (GeographicDivisions.length - cappedPlaces.length)],
      }));
      const filteredPlaces = labelledPlaces.filter(
        (o): o is { place: string; type: GeographicDivision } => o.place !== null,
      );
      if (filteredPlaces.length === labelledPlaces.length) {
        for (let i = 0; i < filteredPlaces.length; i++) {
          const thePlace = filteredPlaces.slice(i);
          const key = JSON.stringify(thePlace);
          places[key] = thePlace;
        }
      }
    }
  });
  return Object.values(places);
};

const CONCURRENT_REQUEST_LIMIT = 1;

const DIRECTORIES: Record<GeographicDivision, string> = {
  [GeographicDivision.City]: 'city',
  [GeographicDivision.Department]: 'department',
  [GeographicDivision.Country]: 'country',
};

const processPlace = async (task: {
  place: { place: string; type: GeographicDivision }[];
  name: string;
  directory: string;
}) => {
  const { place, name, directory } = task;
  const extension = '.svg';
  const filePath = join(directory, `${name}${extension}`);
  try {
    if (existsSync(filePath)) {
      console.log(`[${name}] File exists, ignoring.`);
      return;
    }
    console.log(`[${name}] Fetching coat of arms...`);
    const url = await getCoatOfArmsImageUrl(place);
    if (url !== null) {
      if (url.endsWith(extension)) {
        console.log(`[${name}] SVG found, downloading...`);
        const fileResponse = await fetch(url);
        if (!fileResponse.ok) {
          throw new Error(`Failed to download ${url}: ${fileResponse.statusText}`);
        }
        const buffer = await fileResponse.arrayBuffer();
        writeFileSync(filePath, new Uint8Array(buffer));
        console.log(`[${name}] Saved successfully.`);
      } else {
        console.warn(`[${name}] Unrecognized extension: ${url}`);
      }
    } else {
      console.log(`[${name}] No coat of arms found.`);
    }
  } catch (error) {
    console.error(`[${name}] An error occurred:`, error);
    throw error;
  }
};

const downloadAllCoatOfArms = async () => {
  const allPlaces = await extractPlaces();
  console.log('\nPreparing all tasks for parallel download...');
  const tasks: { place: (typeof allPlaces)[number]; name: string; directory: string }[] = [];
  for (const parts of allPlaces) {
    const directory = DIRECTORIES[parts[0].type];
    const placeDirectory = join(COAT_OF_ARMS_DIRECTORY, directory);
    const name = parts.map(({ place }) => place).join(', ');
    mkdirSync(placeDirectory, { recursive: true });
    tasks.push({ place: parts, name, directory: placeDirectory });
  }
  console.log(`Found ${tasks.length} unique places to process.`);
  console.log(`Starting download with a concurrency of ${CONCURRENT_REQUEST_LIMIT}...\n`);
  await _.parallel(CONCURRENT_REQUEST_LIMIT, tasks, processPlace);
  console.log('\nAll coat of arms processed successfully!');
};

void downloadAllCoatOfArms();
