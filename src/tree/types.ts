import { Vec3 } from '@/math/vec3';
import { Quaternion } from '@/math/quaternion';

/**
 * Parameters for tree generation
 */
export interface TreeParameters {
  // Growth parameters
  trunkHeight: number;
  trunkRadius: number;
  branchLengthDecay: number;  // How much shorter each level is (0.6 - 0.8)
  branchRadiusDecay: number;  // How much thinner each level is (0.5 - 0.7)
  branchAngle: number;        // Angle between branches in radians
  branchTwist: number;        // Rotation around parent branch

  // Recursion control
  maxDepth: number;           // Maximum branching depth

  // Randomness (0 = none, 1 = max)
  lengthVariance: number;
  angleVariance: number;
  twistVariance: number;

  // Visual
  segments: number;           // Cylinder segments for branch geometry
}

/**
 * Default tree parameters
 */
export const DEFAULT_TREE_PARAMS: TreeParameters = {
  trunkHeight: 2.0,
  trunkRadius: 0.15,
  branchLengthDecay: 0.7,
  branchRadiusDecay: 0.65,
  branchAngle: Math.PI / 5,   // 36 degrees
  branchTwist: Math.PI / 3,   // 60 degrees

  maxDepth: 6,

  lengthVariance: 0.1,
  angleVariance: 0.15,
  twistVariance: 0.2,

  segments: 6,
};

/**
 * A single branch node in the tree
 */
export interface BranchNode {
  id: string;
  depth: number;

  // Transform
  startPosition: Vec3;
  endPosition: Vec3;
  direction: Vec3;
  rotation: Quaternion;

  // Geometry
  startRadius: number;
  endRadius: number;
  length: number;

  // Hierarchy
  parent: BranchNode | null;
  children: BranchNode[];

  // Animation state (0-1)
  growthProgress: number;

  // Family tree binding
  personId?: string;
}

/**
 * Family tree person
 */
export interface Person {
  id: string;
  name: string;
  birthYear?: number;
  deathYear?: number;
  parentIds?: [string, string];  // Two parents (binary tree)
  metadata?: Record<string, unknown>;
}

/**
 * Family tree data structure
 */
export interface FamilyTreeData {
  people: Person[];
  rootPersonId: string;
}
