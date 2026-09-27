/**
 * Public API. `ask()` is the fix for the failure this package exists to
 * solve (paper §1.1): a retrieval system that hands back the top-matching
 * passage is answering a question ("what tokens overlap the query") that is
 * provably not the one the caller asked ("what does this mean, to me, right
 * now" — Thm 3.4). `ask()` never returns a bare passage. It always returns a
 * `status` that is honest about grounding strength (Thm 6.4, Thm 6.6–6.7),
 * and a `claim` that is individuated against the caller's own persistent
 * receiver graph (Thm 4.9), not a content-similarity score.
 */
import { type ReceiverSnapshot } from "./receiver.js";
import type { SourceAdapter } from "./sourceAdapter.js";
import { type Catalyst } from "./catalysis.js";
import { type AnswerClass } from "./closure.js";
import type { LLMClient } from "./llm.js";
export type { SourceAdapter, SourceChunk } from "./sourceAdapter.js";
export { InMemorySource } from "./sourceAdapter.js";
export { LocalFileSource, type LocalFileSourceOptions } from "./sources/localFile.js";
export { ContactGraph, MEDIUM } from "./graph.js";
export { ReceiverGraph, type ReceiverSnapshot, type RegisteredCell } from "./receiver.js";
export { Federation, type FederatedClaim } from "./federation.js";
export { assessGrounding, compositePower, type Catalyst, type SupportEdge, type GroundingResult, type GroundingStatus } from "./catalysis.js";
export { runToClosure, type AnswerClass, type AvailableSource, type ClosureResult } from "./closure.js";
export { causalPropagationTable, type PropagationResult } from "./table.js";
export { routeAudit, type FourColumnResult, type OpaqueAnswer } from "./routeAudit.js";
export { waterfill, sqrtGainScene, type Scene, type WaterfillResult } from "./waterfill.js";
export { SplitAttentionAgent } from "./agent.js";
export { Society } from "./society.js";
export type { LLMClient } from "./llm.js";
export interface PersistAdapter {
    load(receiverId: string): Promise<ReceiverSnapshot | undefined>;
    save(snapshot: ReceiverSnapshot): Promise<void>;
}
/** File-based persistence for Node — Thm 8.9: the receiver graph is append-only across process restarts too. */
export declare class JsonFilePersistAdapter implements PersistAdapter {
    private readonly path;
    constructor(path: string);
    load(receiverId: string): Promise<ReceiverSnapshot | undefined>;
    save(snapshot: ReceiverSnapshot): Promise<void>;
}
export interface IndividuatorOptions {
    /** Persistent identity for the receiver graph — one per user, or per project thread (Principle 9.2). */
    receiverId: string;
    sources: SourceAdapter[];
    llm?: LLMClient;
    persist?: PersistAdapter;
    /** Coherence threshold θ (Def 6.3). Default 0.5, per the paper's own majority condition. */
    theta?: number;
    /** Minimum token-overlap for a chunk to be treated as relevant to the query, before catalyst-power scoring. */
    candidateLimit?: number;
}
export type IndividuatedAnswer = {
    status: "grounded";
    claim: string;
    support: readonly Catalyst[];
    floor: number;
} | {
    status: "single-sourced" | "two-sourced";
    claim: string;
    support: readonly Catalyst[];
    floor: number;
    warning: string;
} | {
    status: "contested";
    classes: readonly AnswerClass[];
    warning: string;
} | {
    status: "declined";
    reason: string;
};
export declare class Individuator {
    private receiver;
    private readonly receiverId;
    private readonly federation;
    private readonly llm;
    private readonly persist;
    private readonly theta;
    private readonly candidateLimit;
    private loaded;
    constructor(options: IndividuatorOptions);
    private ensureLoaded;
    /**
     * The fix for "it returns actual text from some pdf that matches my
     * query." This never returns a bare passage: it individuates candidate
     * claims against the caller's own receiver graph (Thm 4.9), requires a
     * coherence triangle before calling anything "grounded" (Thm 6.4), and
     * terminates by closure over every federated source rather than a
     * similarity threshold (Thm 6.6–6.7) — reporting `contested` or
     * `declined` as first-class outcomes rather than silently picking a
     * top-ranked passage.
     */
    ask(query: string): Promise<IndividuatedAnswer>;
    /**
     * Runs the full closure procedure (Def 6.5) instead of the single-round
     * `ask()` above: every federated source is treated as an `AvailableSource`
     * and the search only stops once none can add a new answer class.
     */
    askToClosure(query: string): Promise<IndividuatedAnswer>;
}
export declare function createIndividuator(options: IndividuatorOptions): Individuator;
//# sourceMappingURL=index.d.ts.map