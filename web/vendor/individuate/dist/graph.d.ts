/**
 * Contact graphs (paper §2). A finite weighted graph with a distinguished
 * "medium" vertex adjacent to every other vertex. Vertices other than the
 * medium are "claims" — candidate individuated units of information. An
 * edge's weight is the cost of the distinction separating its endpoints.
 */
export declare const MEDIUM: unique symbol;
export type VertexId = string | typeof MEDIUM;
export interface Edge {
    a: VertexId;
    b: VertexId;
    weight: number;
}
/** Thrown when a graph operation would violate Theorem 2.7 (resolution floor > 0). */
export declare class NonPositiveWeightError extends Error {
    constructor(weight: number);
}
export declare class ContactGraph {
    private readonly vertices;
    private readonly adjacency;
    /** Add a claim vertex, contacted to the medium at the given weight if not already present. */
    addClaim(id: string, mediumWeight: number): void;
    /** Add or update a contact (edge) between two claims already in the graph. */
    addContact(a: VertexId, b: VertexId, weight: number): void;
    private setEdge;
    has(id: VertexId): boolean;
    claims(): string[];
    neighbors(id: VertexId): ReadonlyMap<VertexId, number>;
    edges(): Edge[];
    /** Total edge weight, Ω in the paper — used to normalize alignment scores. */
    totalWeight(): number;
    /**
     * Minimum s-t cut weight via Edmonds–Karp max-flow (max-flow min-cut theorem,
     * Ford–Fulkerson 1956 / Menger 1927 — cited directly in the paper's Method §1.5).
     * Treats the graph as its own capacity network (undirected: capacity both ways).
     */
    minCut(source: VertexId, sink: VertexId): number;
    private bfsAugmentingPath;
    /** Def 2.2: separation cost σ(v) = min cut separating v from the medium. */
    separationCost(claim: string): number;
    /**
     * Thm 2.7 resolution floor β: the infimum separation cost over all claims,
     * equal to the minimum edge weight in a connected graph (proof in the paper
     * shows the floor is attained exactly, confirmed by validation Experiment 1).
     */
    floor(): number;
}
//# sourceMappingURL=graph.d.ts.map