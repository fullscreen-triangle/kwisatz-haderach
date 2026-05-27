"use client";

import { useMemo, useState, useEffect } from 'react';
import crossfilter from 'crossfilter2';
import * as d3 from 'd3';
import * as dc from 'dc';

import { useDCChart, filterAll } from './useDCChart';
import { transformIndex, logSizeBucket, starsBucket, coordDecile } from '../../lib/desk/transform';

const PALETTE = ['#14bfb5', '#60a5fa', '#fbbf24', '#f87171', '#a78bfa', '#34d399', '#fb923c', '#f472b6'];

/**
 * DeskDashboard — 17 crossfilter-linked dc.js charts over desk-index.json.
 * Ported from zangalewa/zoom-climb/src/components/desk/DeskDashboard.tsx.
 * All charts share one crossfilter instance; brushing any chart filters the
 * rest automatically via the dc.js global chart registry.
 */
export default function DeskDashboard({ data }) {
  const rows = useMemo(() => transformIndex(data), [data]);
  const cx   = useMemo(() => crossfilter(rows), [rows]);

  const [filteredCount, setFilteredCount] = useState(rows.length);

  // ── dimensions + groups (stable for the cx lifetime) ──────────────────────
  const dims = useMemo(() => {
    const all = cx.groupAll();
    return {
      all,
      language:       cx.dimension(d => d.language_or_none),
      activity:       cx.dimension(d => d.activity_bucket),
      surface:        cx.dimension(d => d.surface_kind),
      age:            cx.dimension(d => d.age_bucket),
      stars:          cx.dimension(d => starsBucket(d.stargazers_count)),
      topicCount:     cx.dimension(d => {
        const n = d.topic_count;
        return n === 0 ? '0' : n === 1 ? '1' : n <= 3 ? '2-3' : n <= 5 ? '4-5' : '6+';
      }),
      topic:          cx.dimension(d => d.topics, true),     // array-valued
      pushedMonth:    cx.dimension(d => d.pushed_month),
      createdQuarter: cx.dimension(d => d.created_quarter),
      sizeBucket:     cx.dimension(d => logSizeBucket(d.size)),
      sk:             cx.dimension(d => coordDecile(d.coord.S_k)),
      st:             cx.dimension(d => coordDecile(d.coord.S_t)),
      se:             cx.dimension(d => coordDecile(d.coord.S_e)),
      readmeLen:      cx.dimension(d => {
        const l = d.readme_length;
        return l === 0 ? 'empty' : l < 200 ? 'tiny' : l < 600 ? 'short' : l < 1500 ? 'medium' : 'long';
      }),
      descLen:        cx.dimension(d => {
        const l = d.description_length;
        return l === 0 ? '(none)' : l < 50 ? 'short' : l < 100 ? 'medium' : 'long';
      }),
      tableSort:      cx.dimension(d => -d.pushed_date.getTime()),
    };
  }, [cx]);

  // Sync React filtered count via a hidden numberDisplay renderlet
  useEffect(() => {
    const allCount = dims.all.reduceCount();
    const tickerHost = document.createElement('div');
    document.body.appendChild(tickerHost);
    const ticker = dc.numberDisplay(tickerHost).group(allCount).formatNumber(d3.format('d'));
    ticker.on('renderlet', () => setFilteredCount(allCount.value()));
    ticker.render();
    setFilteredCount(allCount.value());
    return () => {
      dc.chartRegistry.deregister(ticker);
      tickerHost.remove();
    };
  }, [dims]);

  // ── chart factories ────────────────────────────────────────────────────────

  const langPie = useDCChart(host => dc.pieChart(host)
    .width(220).height(220).innerRadius(40)
    .dimension(dims.language).group(dims.language.group())
    .ordering(d => -d.value)
    .ordinalColors(PALETTE)
    .legend(dc.legend().x(0).y(190).itemHeight(10).gap(4)),
  [dims]);

  const activityPie = useDCChart(host => {
    const order = ['active', 'recent', 'stale', 'dormant'];
    return dc.pieChart(host)
      .width(220).height(220).innerRadius(40)
      .dimension(dims.activity).group(dims.activity.group())
      .ordering(d => order.indexOf(d.key))
      .ordinalColors(['#4ade80', '#fbbf24', '#fb923c', '#f87171']);
  }, [dims]);

  const surfacePie = useDCChart(host => dc.pieChart(host)
    .width(220).height(220).innerRadius(40)
    .dimension(dims.surface).group(dims.surface.group())
    .ordinalColors(['#60a5fa', '#fbbf24', '#a78bfa', '#14bfb5']),
  [dims]);

  const ageRow = useDCChart(host => {
    const order = ['fresh', '<6mo', '<1y', '<2y', 'older'];
    const chart = dc.rowChart(host)
      .width(280).height(200)
      .margins({ top: 10, right: 10, bottom: 25, left: 50 })
      .dimension(dims.age).group(dims.age.group())
      .ordering(d => order.indexOf(d.key))
      .elasticX(true).ordinalColors(PALETTE);
    chart.xAxis().ticks(4);
    return chart;
  }, [dims]);

  const pushedBar = useDCChart(host => {
    const grp = dims.pushedMonth.group().reduceCount();
    const dates = rows.map(r => r.pushed_month).filter(Boolean);
    const xMin = dates.length ? d3.min(dates) : new Date(2020, 0, 1);
    const xMax = dates.length ? d3.max(dates) : new Date();
    return dc.barChart(host)
      .width(1160).height(180)
      .margins({ top: 10, right: 30, bottom: 30, left: 40 })
      .dimension(dims.pushedMonth).group(grp)
      .x(d3.scaleTime().domain([d3.timeMonth.offset(xMin, -1), d3.timeMonth.offset(xMax, 1)]))
      .xUnits(d3.timeMonths)
      .round(d3.timeMonth.round)
      .alwaysUseRounding(true)
      .centerBar(true).gap(2)
      .elasticY(true)
      .renderHorizontalGridLines(true)
      .brushOn(true)
      .ordinalColors(['#14bfb5']);
  }, [dims, rows]);

  const createdBar = useDCChart(host => {
    const grp = dims.createdQuarter.group().reduceCount();
    const dates = rows.map(r => r.created_quarter).filter(Boolean);
    const xMin = dates.length ? d3.min(dates) : new Date(2020, 0, 1);
    const xMax = dates.length ? d3.max(dates) : new Date();
    return dc.barChart(host)
      .width(1160).height(160)
      .margins({ top: 10, right: 30, bottom: 30, left: 40 })
      .dimension(dims.createdQuarter).group(grp)
      .x(d3.scaleTime().domain([d3.timeMonth.offset(xMin, -3), d3.timeMonth.offset(xMax, 3)]))
      .xUnits((s, e) => Math.max(1, Math.ceil(d3.timeMonth.count(s, e) / 3)))
      .round(d3.timeMonth.round)
      .alwaysUseRounding(true)
      .centerBar(true).gap(4)
      .elasticY(true)
      .renderHorizontalGridLines(true)
      .brushOn(true)
      .ordinalColors(['#60a5fa']);
  }, [dims, rows]);

  const starsRow = useDCChart(host => {
    const order = ['0', '1', '2-5', '6-20', '21+'];
    const chart = dc.rowChart(host)
      .width(280).height(200)
      .margins({ top: 10, right: 10, bottom: 25, left: 40 })
      .dimension(dims.stars).group(dims.stars.group())
      .ordering(d => order.indexOf(d.key))
      .elasticX(true).ordinalColors(PALETTE);
    chart.xAxis().ticks(4);
    return chart;
  }, [dims]);

  const topicCountRow = useDCChart(host => {
    const order = ['0', '1', '2-3', '4-5', '6+'];
    const chart = dc.rowChart(host)
      .width(280).height(200)
      .margins({ top: 10, right: 10, bottom: 25, left: 40 })
      .dimension(dims.topicCount).group(dims.topicCount.group())
      .ordering(d => order.indexOf(d.key))
      .elasticX(true).ordinalColors(PALETTE);
    chart.xAxis().ticks(4);
    return chart;
  }, [dims]);

  const sizeBar = useDCChart(host => {
    const grp = dims.sizeBucket.group().reduceCount();
    const chart = dc.barChart(host)
      .width(380).height(180)
      .margins({ top: 10, right: 20, bottom: 30, left: 40 })
      .dimension(dims.sizeBucket).group(grp)
      .x(d3.scaleLinear().domain([-0.5, 6.5]))
      .xUnits(() => 7)
      .centerBar(true).gap(8)
      .elasticY(true)
      .renderHorizontalGridLines(true)
      .ordinalColors(['#a78bfa']);
    chart.xAxis().tickFormat(d => d === 0 ? '0KB' : `10^${d}KB`);
    return chart;
  }, [dims]);

  const skBar = useDCChart(host => dc.barChart(host)
    .width(380).height(160)
    .margins({ top: 10, right: 20, bottom: 30, left: 40 })
    .dimension(dims.sk).group(dims.sk.group().reduceCount())
    .x(d3.scaleLinear().domain([-0.05, 1.05]))
    .xUnits(() => 11)
    .centerBar(true).gap(4)
    .elasticY(true)
    .renderHorizontalGridLines(true)
    .ordinalColors(['#14bfb5']),
  [dims]);

  const stBar = useDCChart(host => dc.barChart(host)
    .width(380).height(160)
    .margins({ top: 10, right: 20, bottom: 30, left: 40 })
    .dimension(dims.st).group(dims.st.group().reduceCount())
    .x(d3.scaleLinear().domain([-0.05, 1.05]))
    .xUnits(() => 11)
    .centerBar(true).gap(4)
    .elasticY(true)
    .renderHorizontalGridLines(true)
    .ordinalColors(['#60a5fa']),
  [dims]);

  const seBar = useDCChart(host => dc.barChart(host)
    .width(380).height(160)
    .margins({ top: 10, right: 20, bottom: 30, left: 40 })
    .dimension(dims.se).group(dims.se.group().reduceCount())
    .x(d3.scaleLinear().domain([-0.05, 1.05]))
    .xUnits(() => 11)
    .centerBar(true).gap(4)
    .elasticY(true)
    .renderHorizontalGridLines(true)
    .ordinalColors(['#fbbf24']),
  [dims]);

  const readmeLenRow = useDCChart(host => {
    const order = ['empty', 'tiny', 'short', 'medium', 'long'];
    const chart = dc.rowChart(host)
      .width(280).height(200)
      .margins({ top: 10, right: 10, bottom: 25, left: 50 })
      .dimension(dims.readmeLen).group(dims.readmeLen.group())
      .ordering(d => order.indexOf(d.key))
      .elasticX(true).ordinalColors(PALETTE);
    chart.xAxis().ticks(4);
    return chart;
  }, [dims]);

  const descLenRow = useDCChart(host => {
    const order = ['(none)', 'short', 'medium', 'long'];
    const chart = dc.rowChart(host)
      .width(280).height(200)
      .margins({ top: 10, right: 10, bottom: 25, left: 50 })
      .dimension(dims.descLen).group(dims.descLen.group())
      .ordering(d => order.indexOf(d.key))
      .elasticX(true).ordinalColors(PALETTE);
    chart.xAxis().ticks(4);
    return chart;
  }, [dims]);

  const topicsRow = useDCChart(host => {
    const grp   = dims.topic.group();
    const top25 = topNGroup(grp, 25);
    const chart = dc.rowChart(host)
      .width(380).height(500)
      .margins({ top: 10, right: 10, bottom: 25, left: 10 })
      .dimension(dims.topic).group(top25)
      .elasticX(true).ordinalColors(PALETTE);
    chart.xAxis().ticks(4);
    return chart;
  }, [dims]);

  const tableHost = useDCChart(host => dc.dataTable(host)
    .dimension(dims.tableSort)
    .section(d => d.activity_bucket)
    .size(63)
    .columns([
      { label: 'Name',    format: d => `<a href="${d.html_url}" target="_blank" rel="noreferrer" style="color:var(--theme-color)">${d.name}</a>` },
      { label: 'Lang',    format: d => d.language ?? '—' },
      { label: 'Topics',  format: d => d.topics.slice(0, 5).join(' · ') },
      { label: '★',       format: d => d.stargazers_count },
      { label: 'Pushed',  format: d => d.pushed_date.toISOString().slice(0, 10) },
      { label: 'S-coord', format: d => `(${d.coord.S_k.toFixed(2)}, ${d.coord.S_t.toFixed(2)}, ${d.coord.S_e.toFixed(2)})` },
    ])
    .sortBy(d => -d.pushed_date.getTime())
    .order(d3.ascending),
  [dims]);

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px 80px', display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 28, fontFamily: 'var(--heading-font)', fontWeight: 700, color: 'var(--heading-color)' }}>
          {filteredCount} <span style={{ fontSize: 14, opacity: 0.4, fontWeight: 400 }}>of {rows.length} repos</span>
        </div>
        <button onClick={filterAll} style={{ fontSize: 11, background: 'none', border: 'none', color: 'var(--font-color)', opacity: 0.5, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
          reset all filters
        </button>
      </div>

      {/* Row 1: categorical pies + age row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <ChartCard title="Language">      <div ref={langPie}      className="dc-chart" /></ChartCard>
        <ChartCard title="Activity">      <div ref={activityPie}  className="dc-chart" /></ChartCard>
        <ChartCard title="Surface kind">  <div ref={surfacePie}   className="dc-chart" /></ChartCard>
        <ChartCard title="Repo age">      <div ref={ageRow}       className="dc-chart" /></ChartCard>
      </div>

      {/* Row 2: pushes time-series */}
      <ChartCard title="Pushes by month (brush to filter)">
        <div ref={pushedBar} className="dc-chart" />
      </ChartCard>

      {/* Row 3: created time-series */}
      <ChartCard title="Repos created by quarter (brush to filter)">
        <div ref={createdBar} className="dc-chart" />
      </ChartCard>

      {/* Row 4: S-coordinate histograms */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <ChartCard title="S_k · knowledge specificity">  <div ref={skBar} className="dc-chart" /></ChartCard>
        <ChartCard title="S_t · temporal entropy">       <div ref={stBar} className="dc-chart" /></ChartCard>
        <ChartCard title="S_e · evolution depth">        <div ref={seBar} className="dc-chart" /></ChartCard>
      </div>

      {/* Row 5: size + readme + description */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <ChartCard title="Repo size (log KB)">      <div ref={sizeBar}     className="dc-chart" /></ChartCard>
        <ChartCard title="README length">           <div ref={readmeLenRow} className="dc-chart" /></ChartCard>
        <ChartCard title="Description length">      <div ref={descLenRow}   className="dc-chart" /></ChartCard>
      </div>

      {/* Row 6: stars + topic count + top topics */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 280px 1fr', gap: 16 }}>
        <ChartCard title="Stars">               <div ref={starsRow}      className="dc-chart" /></ChartCard>
        <ChartCard title="Topic count">         <div ref={topicCountRow} className="dc-chart" /></ChartCard>
        <ChartCard title="Top topics (click)">  <div ref={topicsRow}     className="dc-chart" /></ChartCard>
      </div>

      {/* Row 7: data table */}
      <ChartCard title="Filtered repos">
        <div ref={tableHost} className="dc-chart dc-data-table" />
      </ChartCard>

      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.25em', opacity: 0.25, paddingTop: 16 }}>
        crossfilter + dc.js · brush any chart to filter every other
      </div>
    </div>
  );
}

function topNGroup(group, n) {
  return {
    all() {
      return group.all().slice().sort((a, b) => b.value - a.value).slice(0, n);
    },
    top(k) { return this.all().slice(0, k); },
  };
}

function ChartCard({ title, children }) {
  return (
    <div style={{
      background: 'var(--assistant-color)',
      border: '1px solid var(--border-color)',
      borderRadius: 8,
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--font-color)', opacity: 0.35, fontWeight: 700 }}>
        {title}
      </div>
      {children}
    </div>
  );
}
