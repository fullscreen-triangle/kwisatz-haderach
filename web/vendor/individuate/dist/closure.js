/**
 * Closure (paper §6.4, Def 6.5, Thm 6.6–6.7): the correct stopping rule for a
 * search, replacing a confidence threshold. A search is closed once no
 * further *available but not-yet-invoked* source can add a new answer class.
 * Thm 6.6 proves closure is strictly stronger than any threshold: a
 * propagation can trivially clear θ up to 0.999999 while an uninvoked
 * catalyst still reaches a genuinely distinct class.
 *
 * Thm 6.7: over a finite registry, every search ends in exactly one of
 * convergent closure (single class — safe to report) or contested closure
 * (>1 class — report the distinct positions as a first-class output,
 * Remark 6.8, never silently pick the top-ranked one).
 */
/**
 * Runs every available source to exhaustion against the registry (Def 6.5)
 * and classifies the outcome per Thm 6.7. This is the *only* correct
 * stopping condition — there is deliberately no early-exit-on-confidence
 * path, since Thm 6.6 constructs a case where that would stop too early.
 */
export async function runToClosure(sources) {
    if (sources.length === 0) {
        return { status: "declined", reason: "no available sources were registered for this query" };
    }
    const classesByKey = new Map();
    for (const source of sources) {
        const result = await source.invoke();
        if (!result)
            continue;
        const existing = classesByKey.get(result.key);
        if (existing) {
            existing.supportingCatalystIds.push(...result.supportingCatalystIds);
        }
        else {
            classesByKey.set(result.key, { ...result, supportingCatalystIds: [...result.supportingCatalystIds] });
        }
    }
    const classes = [...classesByKey.values()];
    if (classes.length === 0) {
        return { status: "declined", reason: "every available source was exhausted and none reached an answer class" };
    }
    if (classes.length === 1) {
        return { status: "closed", classes: [classes[0]] };
    }
    return { status: "contested", classes };
}
//# sourceMappingURL=closure.js.map