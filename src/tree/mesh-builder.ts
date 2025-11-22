import { Vec3 } from '@/math/vec3';
import { Quaternion } from '@/math/quaternion';
import { Mat4 } from '@/math/mat4';
import { Mesh, MeshData } from '@/core/mesh';
import { BranchNode } from './types';

export interface TreeMeshOptions {
  segments: number;
  growthProgress?: number;  // 0-1, controls how much of tree is visible
}

/**
 * Builds mesh geometry for tree branches
 */
export class TreeMeshBuilder {
  private positions: number[] = [];
  private normals: number[] = [];
  private colors: number[] = [];
  private indices: number[] = [];
  private vertexOffset: number = 0;

  constructor(private gl: WebGL2RenderingContext) {}

  /**
   * Build mesh for entire tree
   */
  buildTree(root: BranchNode, options: TreeMeshOptions): Mesh {
    this.reset();
    this.buildBranchRecursive(root, options);
    return this.createMesh();
  }

  /**
   * Build mesh for a single branch (animated growth)
   */
  buildBranch(branch: BranchNode, options: TreeMeshOptions): MeshData {
    this.reset();
    this.buildSingleBranch(branch, options);
    return this.getMeshData();
  }

  private reset(): void {
    this.positions = [];
    this.normals = [];
    this.colors = [];
    this.indices = [];
    this.vertexOffset = 0;
  }

  private buildBranchRecursive(node: BranchNode, options: TreeMeshOptions): void {
    // Check growth progress
    const totalDepth = this.getMaxDepth(node);
    const normalizedDepth = node.depth / Math.max(totalDepth, 1);
    const growthThreshold = options.growthProgress ?? 1;

    if (normalizedDepth > growthThreshold) {
      return;
    }

    // Calculate local growth for smooth animation
    const localGrowth = Math.min(1, (growthThreshold - normalizedDepth) * (totalDepth + 1));

    this.buildSingleBranch(node, { ...options, growthProgress: localGrowth });

    // Recurse to children
    for (const child of node.children) {
      this.buildBranchRecursive(child, options);
    }
  }

  private buildSingleBranch(branch: BranchNode, options: TreeMeshOptions): void {
    const { segments } = options;
    const growth = Math.min(1, Math.max(0, options.growthProgress ?? 1));

    if (growth <= 0) return;

    const startRadius = branch.startRadius;
    const endRadius = branch.endRadius * growth;
    const actualLength = branch.length * growth;

    // Calculate end position based on growth
    const actualEnd = branch.startPosition.add(branch.direction.scale(actualLength));

    // Build cylinder along branch direction
    const direction = branch.direction;

    // Find perpendicular vectors for cylinder
    let tangent = direction.cross(Vec3.UP);
    if (tangent.lengthSquared() < 0.001) {
      tangent = direction.cross(Vec3.RIGHT);
    }
    tangent = tangent.normalize();
    const bitangent = direction.cross(tangent).normalize();

    // Generate ring vertices
    const baseIndex = this.vertexOffset;

    // Color based on depth (more luminescent at tips)
    const depthFactor = branch.depth / 6;
    const baseColor = [
      0.3 + depthFactor * 0.2,  // R
      0.2 + depthFactor * 0.3,  // G
      0.15 + depthFactor * 0.1, // B
      1.0                       // A
    ];

    // Emissive color for tips (more cyan/green glow)
    const emissiveFactor = Math.pow(depthFactor, 2);
    const tipColor = [
      0.1 + emissiveFactor * 0.3,
      0.4 + emissiveFactor * 0.5,
      0.3 + emissiveFactor * 0.4,
      1.0
    ];

    // Bottom ring
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);

      const normal = tangent.scale(cos).add(bitangent.scale(sin));
      const pos = branch.startPosition.add(normal.scale(startRadius));

      this.positions.push(pos.x, pos.y, pos.z);
      this.normals.push(normal.x, normal.y, normal.z);
      this.colors.push(...baseColor);
    }

    // Top ring
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);

      const normal = tangent.scale(cos).add(bitangent.scale(sin));
      const pos = actualEnd.add(normal.scale(endRadius));

      this.positions.push(pos.x, pos.y, pos.z);
      this.normals.push(normal.x, normal.y, normal.z);
      // Blend color towards tip
      this.colors.push(
        baseColor[0] * (1 - growth) + tipColor[0] * growth,
        baseColor[1] * (1 - growth) + tipColor[1] * growth,
        baseColor[2] * (1 - growth) + tipColor[2] * growth,
        1.0
      );
    }

    // Generate indices for cylinder sides
    for (let i = 0; i < segments; i++) {
      const i0 = baseIndex + i;
      const i1 = baseIndex + i + 1;
      const i2 = baseIndex + segments + 1 + i;
      const i3 = baseIndex + segments + 1 + i + 1;

      this.indices.push(i0, i2, i1);
      this.indices.push(i1, i2, i3);
    }

    this.vertexOffset += (segments + 1) * 2;
  }

  private getMaxDepth(node: BranchNode): number {
    if (node.children.length === 0) {
      return node.depth;
    }
    return Math.max(...node.children.map(c => this.getMaxDepth(c)));
  }

  private getMeshData(): MeshData {
    return {
      positions: new Float32Array(this.positions),
      normals: new Float32Array(this.normals),
      colors: new Float32Array(this.colors),
      indices: new Uint16Array(this.indices),
    };
  }

  private createMesh(): Mesh {
    return new Mesh(this.gl, this.getMeshData());
  }
}
