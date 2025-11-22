import { describe, it, expect } from 'vitest';
import { TreeGenerator } from '@/tree/generator';
import { DEFAULT_TREE_PARAMS } from '@/tree/types';

describe('TreeGenerator', () => {
  describe('generate', () => {
    it('creates a root branch', () => {
      const generator = new TreeGenerator({ maxDepth: 0 });
      const tree = generator.generate();

      expect(tree).toBeDefined();
      expect(tree.id).toBe('branch_0');
      expect(tree.depth).toBe(0);
      expect(tree.parent).toBeNull();
    });

    it('creates binary children at each level', () => {
      const generator = new TreeGenerator({ maxDepth: 1 });
      const tree = generator.generate();

      expect(tree.children.length).toBe(2);
      expect(tree.children[0].depth).toBe(1);
      expect(tree.children[1].depth).toBe(1);
    });

    it('respects max depth', () => {
      const generator = new TreeGenerator({ maxDepth: 3 });
      const tree = generator.generate();

      const maxDepth = TreeGenerator.getMaxDepth(tree);
      expect(maxDepth).toBe(3);
    });

    it('applies branch length decay', () => {
      const generator = new TreeGenerator({
        maxDepth: 2,
        trunkHeight: 2.0,
        branchLengthDecay: 0.5,
        lengthVariance: 0,  // No variance for predictable test
      });
      const tree = generator.generate();

      // Child should be half the length of parent (with some tolerance)
      expect(tree.children[0].length).toBeCloseTo(1.0, 1);
    });

    it('applies radius decay', () => {
      const generator = new TreeGenerator({
        maxDepth: 1,
        trunkRadius: 0.2,
        branchRadiusDecay: 0.5,
      });
      const tree = generator.generate();

      expect(tree.startRadius).toBe(0.2);
      expect(tree.endRadius).toBeCloseTo(0.1, 2);
    });

    it('sets correct start/end positions', () => {
      const generator = new TreeGenerator({
        maxDepth: 1,
        trunkHeight: 2.0,
        lengthVariance: 0,
      });
      const tree = generator.generate();

      expect(tree.startPosition.x).toBe(0);
      expect(tree.startPosition.y).toBe(0);
      expect(tree.startPosition.z).toBe(0);

      expect(tree.endPosition.y).toBeCloseTo(2.0, 1);

      // Children should start at parent's end
      expect(tree.children[0].startPosition.y).toBeCloseTo(2.0, 1);
    });
  });

  describe('collectBranches', () => {
    it('collects all branches in tree', () => {
      const generator = new TreeGenerator({ maxDepth: 2 });
      const tree = generator.generate();
      const branches = TreeGenerator.collectBranches(tree);

      // Depth 0: 1 branch
      // Depth 1: 2 branches
      // Depth 2: 4 branches
      // Total: 7
      expect(branches.length).toBe(7);
    });
  });

  describe('getBranchesAtDepth', () => {
    it('returns branches at specific depth', () => {
      const generator = new TreeGenerator({ maxDepth: 3 });
      const tree = generator.generate();

      const depth0 = TreeGenerator.getBranchesAtDepth(tree, 0);
      const depth1 = TreeGenerator.getBranchesAtDepth(tree, 1);
      const depth2 = TreeGenerator.getBranchesAtDepth(tree, 2);
      const depth3 = TreeGenerator.getBranchesAtDepth(tree, 3);

      expect(depth0.length).toBe(1);
      expect(depth1.length).toBe(2);
      expect(depth2.length).toBe(4);
      expect(depth3.length).toBe(8);
    });
  });

  describe('countBranches', () => {
    it('counts total branches correctly', () => {
      const generator = new TreeGenerator({ maxDepth: 4 });
      const tree = generator.generate();
      const count = TreeGenerator.countBranches(tree);

      // 2^0 + 2^1 + 2^2 + 2^3 + 2^4 = 1 + 2 + 4 + 8 + 16 = 31
      expect(count).toBe(31);
    });
  });

  describe('parameters', () => {
    it('uses default parameters when none provided', () => {
      const generator = new TreeGenerator();
      const tree = generator.generate();

      expect(tree.length).toBeCloseTo(DEFAULT_TREE_PARAMS.trunkHeight, 0);
      expect(tree.startRadius).toBe(DEFAULT_TREE_PARAMS.trunkRadius);
    });

    it('merges provided parameters with defaults', () => {
      const generator = new TreeGenerator({
        trunkHeight: 5.0,
        maxDepth: 2,
      });
      const tree = generator.generate();

      expect(tree.length).toBeCloseTo(5.0, 0);
      // Other params should be defaults
      expect(tree.startRadius).toBe(DEFAULT_TREE_PARAMS.trunkRadius);
    });
  });
});
