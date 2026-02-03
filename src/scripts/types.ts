export interface Data {
  data: GenealogyData;
  geographyDisk: GeographyDiskData;
  longevityDisk: LongevityDiskData;
  completenessDisk: CompletenessDiskData;
  childrenCountDisk: ChildrenCountDiskData;
  geographyGeneration: GeographyGenerationData;
}

export interface GenealogyData {
  count: number;
}

export interface IndividualTree<D> {
  father?: IndividualTree<D>;
  mother?: IndividualTree<D>;
  data: D;
}

export interface GeographyDiskData {
  tree: IndividualTree<{ place: (string | null)[] | null }>;
}

export interface LongevityDiskData {
  tree: IndividualTree<{ longevity: number | null }>;
}

export interface EventCompleteness {
  date: boolean;
  place: boolean;
}

export interface CompletenessDiskData {
  tree: IndividualTree<{
    events: { birth: EventCompleteness; marriage: EventCompleteness; death: EventCompleteness } | null;
  }>;
}

export interface ChildrenCountDiskData {
  tree: IndividualTree<{ children: number | null }>;
}

export interface GeographyGenerationData {
  generations: { departments: { place: [string, string]; distribution: number; count: number }[] }[];
}
