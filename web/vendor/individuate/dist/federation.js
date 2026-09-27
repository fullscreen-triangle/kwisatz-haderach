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
export class Federation {
    adapters;
    constructor(adapters) {
        this.adapters = adapters;
        if (adapters.length === 0) {
            throw new Error("Federation requires at least one SourceAdapter (Def 8.1: a federation of zero receivers is not a receiver)");
        }
    }
    /** Union construction (Remark 8.3): every adapter's claims are pooled, none filtered by the others' agreement. */
    async listAll() {
        const results = await Promise.all(this.adapters.map(async (adapter) => {
            const chunks = await adapter.list();
            return chunks.map((c) => ({ ...c, sourceName: adapter.name }));
        }));
        return results.flat();
    }
    /** Number of distinct adapters federated — used by catalysis.ts to check source independence (Cor 6.3). */
    get memberCount() {
        return this.adapters.length;
    }
    memberNames() {
        return this.adapters.map((a) => a.name);
    }
}
//# sourceMappingURL=federation.js.map