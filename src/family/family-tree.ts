import { Person, FamilyTreeData, BranchNode } from '@/tree/types';
import { TreeGenerator } from '@/tree/generator';

/**
 * Family tree data manager
 */
export class FamilyTree {
  private people: Map<string, Person> = new Map();
  private rootPersonId: string | null = null;

  constructor(data?: FamilyTreeData) {
    if (data) {
      this.loadData(data);
    }
  }

  /**
   * Load family tree data
   */
  loadData(data: FamilyTreeData): void {
    this.people.clear();
    for (const person of data.people) {
      this.people.set(person.id, person);
    }
    this.rootPersonId = data.rootPersonId;
  }

  /**
   * Get a person by ID
   */
  getPerson(id: string): Person | undefined {
    return this.people.get(id);
  }

  /**
   * Get all people
   */
  getAllPeople(): Person[] {
    return Array.from(this.people.values());
  }

  /**
   * Get root person
   */
  getRootPerson(): Person | undefined {
    return this.rootPersonId ? this.people.get(this.rootPersonId) : undefined;
  }

  /**
   * Get children of a person (people who have this person as parent)
   */
  getChildren(personId: string): Person[] {
    return this.getAllPeople().filter(p =>
      p.parentIds?.includes(personId)
    );
  }

  /**
   * Get parents of a person
   */
  getParents(personId: string): Person[] {
    const person = this.getPerson(personId);
    if (!person?.parentIds) return [];
    return person.parentIds
      .map(id => this.getPerson(id))
      .filter((p): p is Person => p !== undefined);
  }

  /**
   * Calculate depth of family tree
   */
  getMaxDepth(): number {
    if (!this.rootPersonId) return 0;

    const calculateDepth = (personId: string, visited: Set<string>): number => {
      if (visited.has(personId)) return 0;
      visited.add(personId);

      const children = this.getChildren(personId);
      if (children.length === 0) return 0;

      return 1 + Math.max(...children.map(c => calculateDepth(c.id, visited)));
    };

    return calculateDepth(this.rootPersonId, new Set());
  }

  /**
   * Bind family tree to branch nodes
   */
  bindToBranches(root: BranchNode): Map<string, BranchNode> {
    const binding = new Map<string, BranchNode>();

    if (!this.rootPersonId) return binding;

    const bindRecursive = (personId: string, branch: BranchNode) => {
      const person = this.getPerson(personId);
      if (!person) return;

      branch.personId = personId;
      binding.set(personId, branch);

      const children = this.getChildren(personId);
      for (let i = 0; i < Math.min(children.length, branch.children.length); i++) {
        bindRecursive(children[i].id, branch.children[i]);
      }
    };

    bindRecursive(this.rootPersonId, root);
    return binding;
  }

  /**
   * Export to JSON
   */
  toJSON(): FamilyTreeData {
    return {
      people: this.getAllPeople(),
      rootPersonId: this.rootPersonId ?? '',
    };
  }

  /**
   * Create a sample family tree for demonstration
   */
  static createSampleTree(): FamilyTree {
    const data: FamilyTreeData = {
      rootPersonId: 'root',
      people: [
        { id: 'root', name: 'Great Grandparent', birthYear: 1900 },
        { id: 'g1-1', name: 'Grandparent A', birthYear: 1930, parentIds: ['root', 'root'] },
        { id: 'g1-2', name: 'Grandparent B', birthYear: 1932, parentIds: ['root', 'root'] },
        { id: 'g2-1', name: 'Parent A', birthYear: 1955, parentIds: ['g1-1', 'g1-1'] },
        { id: 'g2-2', name: 'Parent B', birthYear: 1958, parentIds: ['g1-1', 'g1-1'] },
        { id: 'g2-3', name: 'Parent C', birthYear: 1960, parentIds: ['g1-2', 'g1-2'] },
        { id: 'g2-4', name: 'Parent D', birthYear: 1962, parentIds: ['g1-2', 'g1-2'] },
        { id: 'g3-1', name: 'Child A', birthYear: 1985, parentIds: ['g2-1', 'g2-1'] },
        { id: 'g3-2', name: 'Child B', birthYear: 1988, parentIds: ['g2-1', 'g2-1'] },
        { id: 'g3-3', name: 'Child C', birthYear: 1990, parentIds: ['g2-2', 'g2-2'] },
        { id: 'g3-4', name: 'Child D', birthYear: 1992, parentIds: ['g2-2', 'g2-2'] },
        { id: 'g3-5', name: 'Child E', birthYear: 1987, parentIds: ['g2-3', 'g2-3'] },
        { id: 'g3-6', name: 'Child F', birthYear: 1989, parentIds: ['g2-3', 'g2-3'] },
        { id: 'g3-7', name: 'Child G', birthYear: 1991, parentIds: ['g2-4', 'g2-4'] },
        { id: 'g3-8', name: 'Child H', birthYear: 1993, parentIds: ['g2-4', 'g2-4'] },
      ],
    };

    return new FamilyTree(data);
  }
}
