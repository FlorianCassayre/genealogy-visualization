export interface Data {
  data: GenealogyData;
  geographyDisk: GeographyDiskData;
}

export interface GenealogyData {
  count: number;
}

export interface IndividualTree<D> {
  father?: IndividualTree<D>;
  mother?: IndividualTree<D>;
  data: D;
}

export type SimpleIndividualTree = IndividualTree<{ place: string }>;

export interface GeographyDiskData {
  tree: SimpleIndividualTree;
}
