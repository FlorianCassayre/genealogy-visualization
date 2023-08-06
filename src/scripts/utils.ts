import { SelectionIndividualRecord } from 'read-gedcom';
import { IndividualTree } from './types.ts';

export const buildIndividualTree = <D extends object>(
  root: SelectionIndividualRecord,
  // eslint-disable-next-line no-unused-vars
  dataForIndividual: (individual: SelectionIndividualRecord, depth: number) => D,
  depthLimit: number,
): IndividualTree<D> => {
  if (root.length !== 1) {
    throw new Error();
  }
  const visit = (individual: SelectionIndividualRecord, depth: number): IndividualTree<D> => {
    const family = individual.getFamilyAsChild();
    const husband = family.getHusband().getIndividualRecord().arraySelect()[0];
    const wife = family.getWife().getIndividualRecord().arraySelect()[0];
    const newDepth = depth + 1;
    return {
      ...(depth < depthLimit - 1
        ? {
            father: husband ? visit(husband, newDepth) : undefined,
            mother: wife ? visit(wife, newDepth) : undefined,
          }
        : {}),
      data: dataForIndividual(individual, depth),
    };
  };
  return visit(root, 0);
};
