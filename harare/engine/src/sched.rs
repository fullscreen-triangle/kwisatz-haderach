//! Sharing capacity: who starts next, and how divisible resources are split.
//!
//! Two kinds of resource:
//!
//! * **slots** — whole units a task holds while it runs (a Claude session, a
//!   GPU, one of four CPU slots). Admission decides who gets them.
//! * **rates** — divisible capacity running tasks share (network bandwidth,
//!   model tokens per minute). Water-filling decides each task's share.
//!
//! Admission is by *effective priority*: a task's priority multiplied up by
//! how long it has waited, so a low-priority task is eventually first. Smaller
//! tasks may start past a blocked larger one (backfill) until the blocked one
//! has waited `reserve_after` seconds; from then on nothing behind it may take
//! capacity, so it cannot be starved by a stream of small tasks.

use std::collections::BTreeMap;

const EPS: f64 = 1e-9;

/// Priority grown by waiting: `p · (1 + waited / aging)`. With `aging <= 0`
/// priorities do not age. Non-positive or non-finite priorities are treated
/// as the smallest positive priority, so they still age upward.
pub fn effective_priority(priority: f64, waited_s: f64, aging_s: f64) -> f64 {
    let p = if priority.is_finite() && priority > 0.0 { priority } else { f64::MIN_POSITIVE };
    if aging_s > 0.0 {
        p * (1.0 + waited_s.max(0.0) / aging_s)
    } else {
        p
    }
}

#[derive(Clone, Debug)]
pub struct Candidate {
    /// Caller's handle for this piece of pending work.
    pub key: usize,
    pub priority: f64,
    /// Seconds since the work became pending.
    pub waited: f64,
    /// Tie-break: earlier work first.
    pub order: u64,
    /// Slot demands (resource name → units held while running).
    pub slots: BTreeMap<String, f64>,
    /// Runners it may run on, most preferred first.
    pub runners: Vec<String>,
}

/// Free capacity at this instant.
#[derive(Clone, Debug, Default)]
pub struct Pool {
    /// Free units of each slot resource. A resource not listed is unlimited.
    pub resources: BTreeMap<String, f64>,
    /// Free task slots on each runner that is currently reachable. A runner
    /// that is not listed is unreachable.
    pub runners: BTreeMap<String, f64>,
}

#[derive(Clone, Debug, PartialEq)]
pub struct Admission {
    pub key: usize,
    pub runner: String,
}

#[derive(Clone, Debug, Default, PartialEq)]
pub struct AdmitOutcome {
    pub admitted: Vec<Admission>,
    /// A starving candidate that is holding back everything behind it.
    pub reserved_for: Option<usize>,
}

/// Decide which candidates start now, taking their capacity out of `pool`.
pub fn admit(cands: &[Candidate], pool: &mut Pool, aging_s: f64, reserve_after_s: f64) -> AdmitOutcome {
    let mut order: Vec<&Candidate> = cands.iter().collect();
    order.sort_by(|a, b| {
        let pa = effective_priority(a.priority, a.waited, aging_s);
        let pb = effective_priority(b.priority, b.waited, aging_s);
        pb.partial_cmp(&pa).unwrap_or(std::cmp::Ordering::Equal).then(a.order.cmp(&b.order))
    });

    let mut out = AdmitOutcome::default();
    for c in order {
        let reachable: Vec<&String> = c.runners.iter().filter(|r| pool.runners.contains_key(*r)).collect();
        let runner = reachable.iter().find(|r| pool.runners[**r] + EPS >= 1.0).map(|r| (*r).clone());
        let fits = c.slots.iter().all(|(k, d)| pool.resources.get(k).is_none_or(|free| *free + EPS >= *d));
        if let (Some(r), true) = (runner.clone(), fits) {
            *pool.runners.get_mut(&r).unwrap() -= 1.0;
            for (k, d) in &c.slots {
                if let Some(free) = pool.resources.get_mut(k) {
                    *free -= d;
                }
            }
            out.admitted.push(Admission { key: c.key, runner: r });
            continue;
        }
        // Blocked. If it has waited long enough and is blocked by capacity
        // (not by every one of its runners being offline), hold everything
        // behind it so the capacity it needs can drain to it.
        let offline = reachable.is_empty();
        if !offline && reserve_after_s >= 0.0 && c.waited >= reserve_after_s {
            out.reserved_for = Some(c.key);
            break;
        }
    }
    out
}

/// Weighted max-min fair split of `capacity` among claims `(weight, demand)`.
///
/// Every claim gets `min(demand, weight · level)` for one common `level`;
/// claims that ask for less than their fair share are satisfied in full and
/// the rest is shared among the others in proportion to weight. Returns the
/// grants and the level, which is `None` when every demand is met (the
/// resource is not scarce).
pub fn waterfill(capacity: f64, claims: &[(f64, f64)]) -> (Vec<f64>, Option<f64>) {
    let mut grant = vec![0.0; claims.len()];
    if !(capacity > 0.0) {
        return (grant, if claims.iter().any(|c| c.1 > 0.0) { Some(0.0) } else { None });
    }
    let mut active: Vec<usize> = (0..claims.len()).filter(|&i| claims[i].1 > 0.0 && claims[i].0 > 0.0).collect();
    let mut remaining = capacity;
    loop {
        if active.is_empty() {
            return (grant, None);
        }
        let wsum: f64 = active.iter().map(|&i| claims[i].0).sum();
        let level = remaining / wsum;
        let (sat, unsat): (Vec<usize>, Vec<usize>) = active.iter().partition(|&&i| claims[i].1 <= claims[i].0 * level + EPS);
        if sat.is_empty() {
            for &i in &active {
                grant[i] = claims[i].0 * level;
            }
            return (grant, Some(level));
        }
        for &i in &sat {
            grant[i] = claims[i].1;
            remaining -= claims[i].1;
        }
        active = unsat;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn cand(key: usize, priority: f64, waited: f64, slots: &[(&str, f64)], runners: &[&str]) -> Candidate {
        Candidate {
            key,
            priority,
            waited,
            order: key as u64,
            slots: slots.iter().map(|(k, v)| (k.to_string(), *v)).collect(),
            runners: runners.iter().map(|s| s.to_string()).collect(),
        }
    }

    fn pool(res: &[(&str, f64)], runners: &[(&str, f64)]) -> Pool {
        Pool {
            resources: res.iter().map(|(k, v)| (k.to_string(), *v)).collect(),
            runners: runners.iter().map(|(k, v)| (k.to_string(), *v)).collect(),
        }
    }

    #[test]
    fn higher_priority_starts_first() {
        let cs = vec![cand(0, 1.0, 0.0, &[("gpu", 1.0)], &["local"]), cand(1, 5.0, 0.0, &[("gpu", 1.0)], &["local"])];
        let mut p = pool(&[("gpu", 1.0)], &[("local", 4.0)]);
        let out = admit(&cs, &mut p, 60.0, 300.0);
        assert_eq!(out.admitted, vec![Admission { key: 1, runner: "local".into() }]);
    }

    #[test]
    fn waiting_overtakes_priority() {
        // priority 1 waiting 10 minutes vs priority 5 just arrived, aging 60 s:
        // 1·(1+600/60)=11 > 5.
        let cs = vec![cand(0, 1.0, 600.0, &[("gpu", 1.0)], &["local"]), cand(1, 5.0, 0.0, &[("gpu", 1.0)], &["local"])];
        let mut p = pool(&[("gpu", 1.0)], &[("local", 4.0)]);
        assert_eq!(admit(&cs, &mut p, 60.0, 1e9).admitted[0].key, 0);
    }

    #[test]
    fn falls_back_along_runner_preference() {
        let cs = vec![cand(0, 1.0, 0.0, &[], &["laptop", "codespace"])];
        let mut p = pool(&[], &[("codespace", 1.0)]);
        assert_eq!(admit(&cs, &mut p, 60.0, 300.0).admitted[0].runner, "codespace");
        assert_eq!(p.runners["codespace"], 0.0);
    }

    #[test]
    fn backfill_until_reservation() {
        // Big task needs 2 cpu, only 1 free; small one needs 1.
        let big_fresh = vec![cand(0, 10.0, 0.0, &[("cpu", 2.0)], &["local"]), cand(1, 1.0, 0.0, &[("cpu", 1.0)], &["local"])];
        let mut p = pool(&[("cpu", 1.0)], &[("local", 4.0)]);
        let out = admit(&big_fresh, &mut p, 60.0, 300.0);
        assert_eq!(out.admitted.len(), 1, "the small task backfills");
        assert_eq!(out.admitted[0].key, 1);

        let big_starving = vec![cand(0, 10.0, 400.0, &[("cpu", 2.0)], &["local"]), cand(1, 1.0, 0.0, &[("cpu", 1.0)], &["local"])];
        let mut p = pool(&[("cpu", 1.0)], &[("local", 4.0)]);
        let out = admit(&big_starving, &mut p, 60.0, 300.0);
        assert!(out.admitted.is_empty(), "nothing may take the capacity the starving task needs");
        assert_eq!(out.reserved_for, Some(0));
    }

    #[test]
    fn offline_runner_never_reserves() {
        let cs = vec![cand(0, 10.0, 1e6, &[], &["laptop"]), cand(1, 1.0, 0.0, &[], &["local"])];
        let mut p = pool(&[], &[("local", 1.0)]);
        let out = admit(&cs, &mut p, 60.0, 300.0);
        assert_eq!(out.admitted.len(), 1);
        assert_eq!(out.reserved_for, None);
    }

    #[test]
    fn unlisted_resources_are_unlimited() {
        let cs = vec![cand(0, 1.0, 0.0, &[("undeclared", 99.0)], &["local"])];
        let mut p = pool(&[], &[("local", 1.0)]);
        assert_eq!(admit(&cs, &mut p, 60.0, 300.0).admitted.len(), 1);
    }

    #[test]
    fn waterfill_meets_all_demands_when_not_scarce() {
        let (g, level) = waterfill(100.0, &[(1.0, 10.0), (2.0, 20.0)]);
        assert_eq!(g, vec![10.0, 20.0]);
        assert_eq!(level, None);
    }

    #[test]
    fn waterfill_splits_by_weight_and_caps_at_demand() {
        // capacity 30; small claim wants 5 (< its share) and is satisfied;
        // 25 is left for weights 1 and 4 → 5 and 20.
        let (g, level) = waterfill(30.0, &[(1.0, 5.0), (1.0, 100.0), (4.0, 100.0)]);
        assert!((g[0] - 5.0).abs() < 1e-9);
        assert!((g[1] - 5.0).abs() < 1e-9);
        assert!((g[2] - 20.0).abs() < 1e-9);
        assert!((level.unwrap() - 5.0).abs() < 1e-9);
    }

    #[test]
    fn waterfill_never_exceeds_capacity_or_demand() {
        let claims = [(0.5, 3.0), (2.0, 50.0), (1.0, 7.0), (3.0, 0.0), (1.0, 12.5)];
        for cap in [0.0, 1.0, 10.0, 25.0, 72.5, 1000.0] {
            let (g, _) = waterfill(cap, &claims);
            let total: f64 = g.iter().sum();
            assert!(total <= cap + 1e-6, "cap {cap}: granted {total}");
            for (gi, (_, d)) in g.iter().zip(claims.iter()) {
                assert!(*gi <= d + 1e-9 && *gi >= 0.0);
            }
        }
    }
}
