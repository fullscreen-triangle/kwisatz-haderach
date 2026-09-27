/**
 * Receiver graphs (paper §4.3, Def 4.7) and monotone agent history (§8.2, Thm 8.9).
 *
 * A receiver is a specific querying agent's own decoder structure — the
 * distinctions it already holds fixed (a researcher's project history, a
 * user's prior queries). A claim's "meaning" relative to a receiver is its
 * resting cut *in that receiver's own graph*, never a receiver-independent
 * score (Thm 4.9: distinct receivers register distinct, equally correct cells).
 *
 * Thm 8.9 (monotone, irreversible history): the committed count strictly
 * increases under every committed act and is never restored, including by
 * "rollback." Consequently every `registerCell` call is a fresh walk against
 * the *current* graph — never a cached value (Remark 8.10: caching an answer
 * across a growing corpus returns an answer appropriate to a self the system
 * has already left).
 */
export interface RegisteredCell {
    claim: string;
    /** The claim's resting cut in this receiver, i.e. its meaning here — never "the" relevance. */
    separationCost: number;
    /** This receiver's own floor at the moment of registration. */
    floor: number;
    /** Monotone act count at which this registration was computed (Thm 8.9). */
    committedCount: number;
}
export interface ReceiverSnapshot {
    receiverId: string;
    committedCount: number;
    claims: string[];
    edges: Array<{
        a: string;
        b: string;
        weight: number;
    }>;
}
export declare class ReceiverGraph {
    readonly receiverId: string;
    private readonly graph;
    private committedCount;
    constructor(receiverId: string, snapshot?: ReceiverSnapshot);
    /** Every mutation is a committed act: the count only ever increases (Thm 8.9). */
    private commit;
    /**
     * Fix a distinction the receiver already holds: a new claim (or a stronger
     * contact between existing claims). This is how "prior queries and project
     * context" accrete into the receiver's own graph over a session (Principle 9.2).
     */
    fixDistinction(claim: string, mediumWeight?: number): void;
    fixContact(a: string, b: string, weight: number): void;
    /** An explicit "undo" is itself a further committed act — it never lowers the count (Thm 8.9 proof). */
    acknowledgeRollbackAttempt(): void;
    get history(): {
        committedCount: number;
    };
    /**
     * Def 4.7 / Thm 4.9: register the cell a claim occupies *in this receiver*.
     * Always a fresh walk against the current graph, never a cached fetch
     * (Remark 8.10) — the committedCount on the result proves it was computed now.
     */
    registerCell(claim: string, mediumWeight?: number): RegisteredCell;
    floor(): number;
    snapshot(): ReceiverSnapshot;
}
//# sourceMappingURL=receiver.d.ts.map