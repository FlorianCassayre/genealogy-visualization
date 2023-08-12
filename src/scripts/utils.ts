import { SelectionIndividualRecord } from 'read-gedcom';
import { IndividualTree } from './types.ts';

export const buildIndividualTree = <D extends object>(
  root: SelectionIndividualRecord,

  dataForIndividual: (
    // eslint-disable-next-line no-unused-vars
    individual: SelectionIndividualRecord,
    // eslint-disable-next-line no-unused-vars
    depth: number,
    // eslint-disable-next-line no-unused-vars
    child: SelectionIndividualRecord | null,
  ) => D,
  depthLimit: number,
): IndividualTree<D> => {
  if (root.length !== 1) {
    throw new Error();
  }
  const visit = (
    individual: SelectionIndividualRecord,
    depth: number,
    child: SelectionIndividualRecord | null,
  ): IndividualTree<D> => {
    const family = individual.getFamilyAsChild();
    const husband = family.getHusband().getIndividualRecord().arraySelect()[0];
    const wife = family.getWife().getIndividualRecord().arraySelect()[0];
    const newDepth = depth + 1;
    return {
      ...(depth < depthLimit - 1
        ? {
            father: husband ? visit(husband, newDepth, individual) : undefined,
            mother: wife ? visit(wife, newDepth, individual) : undefined,
          }
        : {}),
      data: dataForIndividual(individual, depth, child),
    };
  };
  return visit(root, 0, null);
};
