import { Vec3 } from '@/math/vec3';
import { Quaternion } from '@/math/quaternion';
import { MathUtils } from '@/math';
import { BranchNode, TreeParameters, DEFAULT_TREE_PARAMS } from './types';

/**
 * Generates a binary tree structure
 */
export class TreeGenerator {
  private params: TreeParameters;
  private nodeCount: number = 0;

  constructor(params: Partial<TreeParameters> = {}) {
    this.params = { ...DEFAULT_TREE_PARAMS, ...params };
  }

  /**
   * Generates a complete tree from parameters
   */
  generate(): BranchNode {
    this.nodeCount = 0;
    return this.createBranch(
      null,
      new Vec3(0, 0, 0),
      new Vec3(0, 1, 0),
      Quaternion.identity(),
      this.params.trunkHeight,
      this.params.trunkRadius,
      0
    );
  }

  /**
   * Generates a tree that maps to a family tree structure
   */
  generateFromFamilyTree(
    _peopleByDepth: Map<number, string[]>,
    maxDepth: number
  ): BranchNode {
    this.nodeCount = 0;
    const modifiedParams = { ...this.params, maxDepth };
    this.params = modifiedParams;
    return this.generate();
  }

  private createBranch(
    parent: BranchNode | null,
    startPosition: Vec3,
    direction: Vec3,
    rotation: Quaternion,
    length: number,
    radius: number,
    depth: number
  ): BranchNode {
    const { params } = this;

    // Apply variance
    const actualLength = length * (1 + MathUtils.randomRange(-params.lengthVariance, params.lengthVariance));
    const endPosition = startPosition.add(direction.scale(actualLength));

    const node: BranchNode = {
      id: `branch_${this.nodeCount++}`,
      depth,
      startPosition,
      endPosition,
      direction: direction.normalize(),
      rotation,
      startRadius: radius,
      endRadius: radius * params.branchRadiusDecay,
      length: actualLength,
      parent,
      children: [],
      growthProgress: 0,
    };

    // Create children if not at max depth
    if (depth < params.maxDepth) {
      const childLength = actualLength * params.branchLengthDecay;
      const childRadius = radius * params.branchRadiusDecay;

      // Binary branching: left and right children
      for (let i = 0; i < 2; i++) {
        const side = i === 0 ? 1 : -1;

        // Calculate branch angle with variance
        const branchAngle = params.branchAngle * (1 + MathUtils.randomRange(-params.angleVariance, params.angleVariance));

        // Calculate twist with variance
        const twist = params.branchTwist * side * (1 + MathUtils.randomRange(-params.twistVariance, params.twistVariance));

        // Create rotation for branching
        // First rotate around the parent's direction (twist)
        const twistQuat = Quaternion.fromAxisAngle(direction, twist);

        // Find a perpendicular axis for the branch angle
        let perpAxis = direction.cross(Vec3.RIGHT);
        if (perpAxis.lengthSquared() < 0.001) {
          perpAxis = direction.cross(Vec3.FORWARD);
        }
        perpAxis = perpAxis.normalize();

        // Rotate the perpendicular axis by the twist
        perpAxis = twistQuat.rotate(perpAxis);

        // Create rotation for branch angle
        const angleQuat = Quaternion.fromAxisAngle(perpAxis, branchAngle);

        // Calculate new direction
        const childDirection = angleQuat.rotate(direction).normalize();
        const childRotation = rotation.multiply(twistQuat).multiply(angleQuat);

        const child = this.createBranch(
          node,
          endPosition,
          childDirection,
          childRotation,
          childLength,
          childRadius,
          depth + 1
        );

        node.children.push(child);
      }
    }

    return node;
  }

  /**
   * Collect all branches in the tree (for rendering)
   */
  static collectBranches(root: BranchNode): BranchNode[] {
    const branches: BranchNode[] = [];

    const traverse = (node: BranchNode) => {
      branches.push(node);
      for (const child of node.children) {
        traverse(child);
      }
    };

    traverse(root);
    return branches;
  }

  /**
   * Get branches at a specific depth
   */
  static getBranchesAtDepth(root: BranchNode, depth: number): BranchNode[] {
    return TreeGenerator.collectBranches(root).filter(b => b.depth === depth);
  }

  /**
   * Calculate total number of branches
   */
  static countBranches(root: BranchNode): number {
    let count = 1;
    for (const child of root.children) {
      count += TreeGenerator.countBranches(child);
    }
    return count;
  }

  /**
   * Find max depth of tree
   */
  static getMaxDepth(root: BranchNode): number {
    if (root.children.length === 0) {
      return root.depth;
    }
    return Math.max(...root.children.map(c => TreeGenerator.getMaxDepth(c)));
  }
}
