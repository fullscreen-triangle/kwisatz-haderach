import { useEffect, useRef } from 'react';
import * as dc from 'dc';

/**
 * Mount a dc.js chart into a React-managed div.
 * The factory receives the host element and passes it to a dc constructor.
 * dc.js + crossfilter handle the linked-brushing automatically via the
 * global chart registry.
 */
export function useDCChart(factory, deps = []) {
  const ref      = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = '';      // clean slate for React strict-mode double-render

    const chart = factory(ref.current);
    chart.render();
    chartRef.current = chart;

    return () => {
      try { dc.chartRegistry.deregister(chart); } catch {}
      if (ref.current) ref.current.innerHTML = '';
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}

export function renderAll() { dc.renderAll(); }
export function redrawAll() { dc.redrawAll(); }
export function filterAll()  { dc.filterAll(); dc.renderAll(); }
