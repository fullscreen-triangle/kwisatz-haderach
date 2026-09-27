/**
 * Federation (paper §8.1, Def 8.1, Thm 8.2). A federation unions several
 * receivers' candidate projections — here, several SourceAdapters' claims —
 * into one contact graph, exactly the union construction Remark 8.3
 * distinguishes from ensembling-by-vote: every source's candidate is
 * offered as admissible, so a query on which one member is precise
 * benefits the whole federation even where the others are not.
 *
 * Thm 8.2: the federation floor is <= min_i floor(receiver_i), strictly
 * whenever non-redundant. We don't need to *measure* the floor drop here
 * (that's an offline validation concern, §9); what this module guarantees
 * structurally is that no source is asked to agree with another's internal
 * representation before its claims are admitted — federation, not voting.
 */
import type { SourceAdapter, SourceChunk } from "./sourceAdapter.js";
export interface FederatedClaim extends SourceChunk {
    /** Which adapter this claim came from — the catalyst `source` field downstream (Def 6.1). */
    sourceName: string;
}
export declare class Federation {
    private readonly adapters;
    constructor(adapters: readonly SourceAdapter[]);
    /** Union construction (Remark 8.3): every adapter's claims are pooled, none filtered by the others' agreement. */
    listAll(): Promise<FederatedClaim[]>;
    /** Number of distinct adapters federated — used by catalysis.ts to check source independence (Cor 6.3). */
    get memberCount(): number;
    memberNames(): string[];
}
//# sourceMappingURL=federation.d.ts.map