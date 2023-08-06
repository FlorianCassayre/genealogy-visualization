export interface Data {
  data: GenealogyData;
  geographyDisk: GeographyDiskData;
  longevityDisk: LongevityDiskData;
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
