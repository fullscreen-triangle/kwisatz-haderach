/**
 * Four-column route-audit (paper §7, Def 7.1–7.3, Thm 7.4–7.6). Certifies
 * agreement between two opaque sources (no shared internal representation —
 * a domain model against a document index, say) by comparing what each
 * answer PROVOKES as a follow-up, not just their surface content.
 *
 * Thm 7.6 (the false-friend construction): two receivers can produce
 * numerically identical central columns (surface agreement) while their
 * provoked columns diverge — invisible to endpoint-only comparison,
 * exactly the failure this module exists to catch (Remark 7.7: two
 * internal documents can agree for different reasons).
 */
import type { LLMClient } from "./llm.js";
export interface OpaqueAnswer {
    sourceId: string;
    /** The central column: this source's answer to the query. */
    central: string;
}
export interface FourColumnResult {
    quiescent: boolean;
    centralAgree: boolean;
    provokedAgree: boolean;
    columns: {
        aCentral: string;
        bCentral: string;
        aProvoked: string;
        bProvoked: string;
    };
    rounds: number;
}
export interface RouteAuditOptions {
    query: string;
    a: OpaqueAnswer;
    b: OpaqueAnswer;
    llm: LLMClient;
    /** Tolerance for textual-similarity-based "agreement" between columns, in [0,1]. Default 0.85 (near-identity). */
    similarityThreshold?: number;
    maxRounds?: number;
}
/**
 * Thm 7.4: the system is quiescent iff (a) central columns agree AND (b)
 * provoked columns agree. Thm 7.5 dichotomy: either reaches quiescence in
 * finitely many rounds, or the residual is bounded away from zero — no
 * third outcome, so this always terminates within maxRounds.
 */
export declare function routeAudit(options: RouteAuditOptions): Promise<FourColumnResult>;
//# sourceMappingURL=routeAudit.d.ts.map