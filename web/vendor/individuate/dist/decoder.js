/**
 * Decoder / Projector (paper §4.2, Def 4.4) and the recognition/search
 * identity (Thm 4.5): Dec(q) = v  <=>  q ∈ Proj(v). Recognition (computing
 * Dec(q) for a query) and search (computing a representative of Proj(v) for
 * a target claim) are inverse readings of one relation — neither is
 * definable without the other, and no third, privileged place ("the
 * answer") exists outside this joint fact (Remark 4.6).
 */
/** Builds Proj from Dec over a finite, explicitly enumerated query domain. */
export class Projector {
    fibers = new Map();
    constructor(decode, domain) {
        for (const q of domain) {
            const v = decode(q);
            const bucket = this.fibers.get(v);
            if (bucket)
                bucket.push(q);
            else
                this.fibers.set(v, [q]);
        }
    }
    /** Proj(v) = Dec⁻¹({v}) — every query that decodes to this claim. */
    project(v) {
        return this.fibers.get(v) ?? [];
    }
    /** The claims this projector has registered as reachable at all. */
    range() {
        return [...this.fibers.keys()];
    }
}
/**
 * Recovers Dec from a fiber map {Proj(v)}, per the proof of Thm 4.5: a
 * decoder and its fibre map determine each other on a finite domain.
 */
export function decoderFromFibers(fibers, queryKey) {
    const lookup = new Map();
    for (const [v, queries] of fibers) {
        for (const q of queries)
            lookup.set(queryKey(q), v);
    }
    return (q) => {
        const v = lookup.get(queryKey(q));
        if (v === undefined)
            throw new Error("query not in any registered fiber — recognition/search identity requires a covering domain");
        return v;
    };
}
//# sourceMappingURL=decoder.js.map