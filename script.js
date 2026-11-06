"use strict";

(function () {
  const DATA_URL = "girls_education_fertility.csv";
  const REPLACEMENT = 2.1;
  const STATIC_YEARS = [1990, 2015];
  const STATIC_LABELS = ["Brazil", "Nigeria", "India", "China", "United States", "Korea, Rep."];

  const MEASURES = {
    sec: { key: "sec_enroll_female", axis: "Girls enrolled in secondary school (% gross)", noun: "Girls in secondary school" },
    ter: { key: "ter_enroll_female", axis: "Women enrolled in tertiary education (% gross)", noun: "Women in tertiary education" },
  };

  const fmt0 = d3.format(",.0f");
  const fmt1 = d3.format(".1f");
  const fmt2 = d3.format(".2f");
  const shortName = (n) => n.replace(", Rep.", "");

  d3.csv(DATA_URL, d3.autoType).then(init).catch((err) => {
    console.error(err);
    d3.select("#error").property("hidden", false);
  });

  function init(data) {
    // constants
    const popMax = d3.max(data, (d) => d.population);
    const yDomain = [0.5, Math.ceil(d3.max(data, (d) => d.fertility) * 2) / 2];
    const xDomains = {
      sec: [0, Math.ceil(d3.max(data, (d) => d.sec_enroll_female) / 10) * 10],
      ter: [0, Math.ceil(d3.max(data, (d) => d.ter_enroll_female) / 10) * 10],
    };

    // diverging red (boys ahead); warm grey (parity); blue (girls ahead)
    const gapInterp = d3.interpolateRgbBasis(["#9b1d34", "#d6604d", "#d8d2c8", "#5aa0c8", "#1f4e8c"]);
    const color = d3.scaleDiverging(gapInterp).domain([-40, 0, 40]).clamp(true);
    const DOT_STROKE = "rgba(30, 41, 59, 0.35)";

    const byCode = d3.group(data, (d) => d.code);
    const codeToName = new Map(data.map((d) => [d.code, d.country]));
    const nameToCode = new Map(data.map((d) => [d.country.toLowerCase(), d.code]));

    // index rows by measure -> year
    const idx = {};
    const years = {};
    Object.keys(MEASURES).forEach((k) => {
      const key = MEASURES[k].key;
      const valid = data.filter((d) => d[key] != null && d.fertility != null);
      idx[k] = d3.group(valid, (d) => d.year);
      years[k] = Array.from(idx[k].keys()).sort(d3.ascending);
    });
    const rowsAt = (m, y) => idx[m].get(y) || [];

    // correlation by year for each measure
    const corr = {};
    Object.keys(MEASURES).forEach((k) => {
      corr[k] = years[k]
        .map((y) => ({ year: y, n: rowsAt(k, y).length, r: pearson(rowsAt(k, y), MEASURES[k].key) }))
        .filter((d) => d.n >= 20);
    });

    function pearson(rows, key) {
      const mx = d3.mean(rows, (d) => d[key]);
      const my = d3.mean(rows, (d) => d.fertility);
      let sxy = 0, sxx = 0, syy = 0;
      rows.forEach((d) => {
        const dx = d[key] - mx, dy = d.fertility - my;
        sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
      });
      return sxy / Math.sqrt(sxx * syy);
    }

    /* ---------- shared helpers ---------- */
    function buildScatter(selector, o) {
      const m = o.margin;
      const iw = o.width - m.left - m.right;
      const ih = o.height - m.top - m.bottom;

      const svg = d3.select(selector).append("svg")
        .attr("viewBox", `0 0 ${o.width} ${o.height}`)
        .attr("role", "img")
        .attr("aria-label", o.aria);

      const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);
      const x = d3.scaleLinear().domain(o.xDomain).range([0, iw]);
      const y = d3.scaleLinear().domain(yDomain).range([ih, 0]);
      const r = d3.scaleSqrt().domain([0, popMax]).range([2, o.rMax]);

      const grid = g.append("g").attr("class", "grid");
      const xAxis = g.append("g").attr("class", "axis").attr("transform", `translate(0,${ih})`);
      const yAxis = g.append("g").attr("class", "axis");

      grid.call(d3.axisLeft(y).ticks(8).tickSize(-iw).tickFormat(""));
      xAxis.call(d3.axisBottom(x).ticks(8));
      yAxis.call(d3.axisLeft(y).ticks(8));

      const xLabel = g.append("text").attr("class", "axis-label")
        .attr("x", iw / 2).attr("y", ih + 42).attr("text-anchor", "middle").text(o.xLabel);
      g.append("text").attr("class", "axis-label")
        .attr("transform", "rotate(-90)").attr("x", -ih / 2).attr("y", -m.left + 16)
        .attr("text-anchor", "middle").text("Births per woman (total fertility rate)");

      g.append("line").attr("class", "ref-line")
        .attr("x1", 0).attr("x2", iw).attr("y1", y(REPLACEMENT)).attr("y2", y(REPLACEMENT));
      g.append("text").attr("class", "ref-label")
        .attr("x", iw - 4).attr("y", y(REPLACEMENT) - 5).attr("text-anchor", "end")
        .text("replacement level (2.1 births)");

      const layers = {
        watermark: g.append("g"),
        trails: g.append("g"),
        dots: g.append("g"),
        labels: g.append("g"),
        message: g.append("g"),
      };

      const chart = { svg, g, x, y, r, iw, ih, layers, xAxis, grid, xLabel, key: o.key };

      chart.radius = (d) => (d.population ? r(d.population) : 3);

      chart.setMeasure = function (key, domain, label) {
        chart.key = key;
        x.domain(domain);
        xAxis.transition().duration(500).call(d3.axisBottom(x).ticks(8));
        xLabel.text(label);
      };

      return chart;
    }

    function buildLegend(selector) {
      const w = 640, h = 72;
      const svg = d3.select(selector).append("svg").attr("class", "legend")
        .attr("viewBox", `0 0 ${w} ${h}`).attr("role", "img")
        .attr("aria-label", "Legend: color shows girls minus boys secondary enrollment, area shows population");
      const id = "grad-" + selector.replace(/[^a-z]/gi, "");
      const grad = svg.append("defs").append("linearGradient").attr("id", id);
      d3.range(0, 1.001, 0.1).forEach((t) =>
        grad.append("stop").attr("offset", t).attr("stop-color", gapInterp(t)));

      svg.append("text").attr("x", 0).attr("y", 12).style("font-weight", 600)
        .text("Color: Girls minus Boys Enrollment (pp)");
      svg.append("rect").attr("x", 0).attr("y", 22).attr("width", 260).attr("height", 12).attr("rx", 2).attr("fill", `url(#${id})`);
      const lx = d3.scaleLinear().domain([-40, 40]).range([0, 260]);
      [[-40, "−40 boys ahead"], [0, "0"], [40, "+40 girls ahead"]].forEach(([v, t], i) => {
        svg.append("text").attr("x", lx(v)).attr("y", 50)
          .attr("text-anchor", i === 0 ? "start" : i === 2 ? "end" : "middle").text(t);
      });

      svg.append("text").attr("x", 340).attr("y", 12).style("font-weight", 600).text("Area: population");
      const rs = d3.scaleSqrt().domain([0, popMax]).range([2, 16]);
      let left = 340;
      [[1e7, "10 M"], [1e8, "100 M"], [1e9, "1 B"]].forEach(([v, t]) => {
        const rr = rs(v);
        svg.append("circle").attr("cx", left + rr).attr("cy", 38).attr("r", rr)
          .attr("fill", "none").attr("stroke", "#64748b");
        svg.append("text").attr("x", left + rr).attr("y", 66).attr("text-anchor", "middle").text(t);
        left += rr * 2 + 34;
      });
    }

    // static graph
    (function drawStatic() {
      const panels = d3.select("#static-charts");
      const dom = xDomains.sec;
      STATIC_YEARS.forEach((year) => {
        const rows = rowsAt("sec", year);
        const panel = panels.append("div").attr("class", "panel");
        panel.append("h3").html(`${year} <span>· ${rows.length} countries</span>`);
        const holder = panel.append("div").attr("id", `static-${year}`);

        const chart = buildScatter(`#static-${year}`, {
          width: 540, height: 430, margin: { top: 10, right: 14, bottom: 52, left: 56 },
          xDomain: dom, xLabel: MEASURES.sec.axis, rMax: 24, key: MEASURES.sec.key,
          aria: `Scatterplot for ${year}: girls' secondary enrollment versus births per woman`,
        });

        const sorted = rows.slice().sort((a, b) => d3.descending(a.population || 0, b.population || 0));
        chart.layers.dots.selectAll("circle").data(sorted).join("circle")
          .attr("cx", (d) => chart.x(d.sec_enroll_female))
          .attr("cy", (d) => chart.y(d.fertility))
          .attr("r", chart.radius)
          .attr("fill", (d) => color(d.enroll_gap))
          .attr("fill-opacity", 0.85)
          .attr("stroke", DOT_STROKE).attr("stroke-width", 0.7);

        chart.layers.labels.selectAll("text").data(sorted.filter((d) => STATIC_LABELS.includes(d.country)))
          .join("text").attr("class", "halo")
          .attr("x", (d) => chart.x(d.sec_enroll_female) + chart.radius(d) + 3)
          .attr("y", (d) => chart.y(d.fertility) - 3)
          .text((d) => shortName(d.country));
      });
      buildLegend("#legend-static");
    })();

    // dynamic/interactive graph
    const state = { measure: "sec", year: 1970, playing: false, pinned: new Set() };
    let timer = null;

    const tooltip = d3.select("#tooltip");
    const slider = d3.select("#year");
    const yearOut = d3.select("#year-out");
    const playBtn = d3.select("#play");

    const chart = buildScatter("#scatter", {
      width: 860, height: 560, margin: { top: 14, right: 20, bottom: 54, left: 62 },
      xDomain: xDomains.sec, xLabel: MEASURES.sec.axis, rMax: 30, key: MEASURES.sec.key,
      aria: "Animated scatterplot of female enrollment versus births per woman, by country and year",
    });
    buildLegend("#legend");

    const watermark = chart.layers.watermark.append("text").attr("class", "year-watermark")
      .attr("x", chart.iw - 10).attr("y", 120).attr("text-anchor", "end");
    const emptyMsg = chart.layers.message.append("text").attr("class", "empty-msg")
      .attr("x", chart.iw / 2).attr("y", chart.ih / 2).attr("text-anchor", "middle").text("");

    d3.select("#countries").selectAll("option")
      .data(Array.from(new Set(data.map((d) => d.country))).sort(d3.ascending))
      .join("option").attr("value", (d) => d);

    // function for tooltip
    function showTip(event, d) {
      const key = MEASURES[state.measure].key;
      const gap = d.enroll_gap;
      const gapTxt = (gap > 0 ? "+" : "") + fmt1(gap) + " pp";
      const pop = d.population == null ? "n/a"
        : d.population >= 1e9 ? fmt2(d.population / 1e9) + " billion"
        : d.population >= 1e6 ? fmt1(d.population / 1e6) + " million"
        : fmt0(d.population / 1e3) + " thousand";
      const row = (a, b) => `<div class="row"><span>${a}</span><span>${b}</span></div>`;
      tooltip.html(
        `<strong>${d.country}</strong> · ${d.year}` +
        row(MEASURES[state.measure].noun, fmt1(d[key]) + "%") +
        row("Births per woman", fmt2(d.fertility)) +
        row("Teen births /1,000", d.adolescent_fertility == null ? "n/a" : fmt0(d.adolescent_fertility)) +
        row("Girls − boys (secondary)", gapTxt) +
        row("Population", pop)
      ).style("opacity", 1).attr("aria-hidden", "false");
      moveTip(event);
    }
    function moveTip(event) {
      const node = tooltip.node();
      const w = node.offsetWidth;
      let left = event.pageX + 14;
      if (left + w > window.scrollX + document.documentElement.clientWidth - 8) left = event.pageX - w - 14;
      tooltip.style("left", left + "px").style("top", event.pageY - 12 + "px");
    }
    function hideTip() { tooltip.style("opacity", 0).attr("aria-hidden", "true"); }

    // function for dots
    function drawDots(rows, dur) {
      const key = MEASURES[state.measure].key;
      const sorted = rows.slice().sort((a, b) => d3.descending(a.population || 0, b.population || 0));

      const sel = chart.layers.dots.selectAll("circle.dot:not(.leaving)").data(sorted, (d) => d.code);

      sel.exit().classed("leaving", true)
        .transition().duration(dur).attr("r", 0).remove();

      const entered = sel.enter().append("circle").attr("class", "dot")
        .attr("cx", (d) => chart.x(d[key])).attr("cy", (d) => chart.y(d.fertility))
        .attr("r", 0).attr("fill-opacity", 0.85).attr("stroke", DOT_STROKE).attr("stroke-width", 0.7)
        .attr("fill", (d) => color(d.enroll_gap));

      const merged = entered.merge(sel)
        .on("mouseenter", showTip).on("mousemove", moveTip).on("mouseleave", hideTip)
        .on("click", (event, d) => togglePin(d.code));

      merged.sort((a, b) => d3.descending(a.population || 0, b.population || 0));

      merged.classed("pinned", (d) => state.pinned.has(d.code))
        .attr("stroke", (d) => (state.pinned.has(d.code) ? "#111" : DOT_STROKE))
        .attr("stroke-width", (d) => (state.pinned.has(d.code) ? 2 : 0.7))
        .transition().duration(dur).ease(d3.easeLinear)
        .attr("cx", (d) => chart.x(d[key])).attr("cy", (d) => chart.y(d.fertility))
        .attr("r", chart.radius).attr("fill", (d) => color(d.enroll_gap));

      return sorted;
    }

    function drawPinned(rows, dur) {
      const key = MEASURES[state.measure].key;

      const labelRows = rows.filter((d) => state.pinned.has(d.code));
      chart.layers.labels.selectAll("text.halo").data(labelRows, (d) => d.code)
        .join(
          (enter) => enter.append("text").attr("class", "halo")
            .attr("x", (d) => chart.x(d[key]) + chart.radius(d) + 3).attr("y", (d) => chart.y(d.fertility) - 3),
          (update) => update,
          (exit) => exit.remove()
        )
        .text((d) => shortName(d.country))
        .transition().duration(dur).ease(d3.easeLinear)
        .attr("x", (d) => chart.x(d[key]) + chart.radius(d) + 3)
        .attr("y", (d) => chart.y(d.fertility) - 3);

      const trails = Array.from(state.pinned).map((code) => ({
        code,
        rows: (byCode.get(code) || []).filter((d) => d[key] != null).sort((a, b) => d3.ascending(a.year, b.year)),
      })).filter((t) => t.rows.length > 1);

      const line = d3.line().x((d) => chart.x(d[key])).y((d) => chart.y(d.fertility));

      const tsel = chart.layers.trails.selectAll("g.trail").data(trails, (t) => t.code)
        .join((enter) => {
          const gg = enter.append("g").attr("class", "trail");
          gg.append("path");
          gg.append("text").attr("class", "t-start");
          gg.append("text").attr("class", "t-end");
          return gg;
        });

      tsel.select("path").attr("d", (t) => line(t.rows));
      tsel.select(".t-start")
        .attr("x", (t) => chart.x(t.rows[0][key]) - 4).attr("y", (t) => chart.y(t.rows[0].fertility) - 6)
        .attr("text-anchor", "end").text((t) => t.rows[0].year);
      tsel.select(".t-end")
        .attr("x", (t) => chart.x(t.rows[t.rows.length - 1][key]) + 4)
        .attr("y", (t) => chart.y(t.rows[t.rows.length - 1].fertility) + 14)
        .text((t) => t.rows[t.rows.length - 1].year);
    }

    function updateTakeaway(rows) {
      d3.select("#takeaway-year").text(state.year);
      const el = d3.select("#takeaway");
      if (rows.length < 9) {
        el.html("Too few countries report this measure in this year to compare. Try another year.");
        return;
      }
      const key = MEASURES[state.measure].key;
      const sorted = rows.slice().sort((a, b) => d3.ascending(a[key], b[key]));
      const third = Math.floor(sorted.length / 3);
      const lo = sorted.slice(0, third), hi = sorted.slice(-third);
      const r = pearson(rows, key);
      const noun = MEASURES[state.measure].noun.toLowerCase();
      const loMax = d3.max(lo, (d) => d[key]);
      const hiMin = d3.min(hi, (d) => d[key]);
      const note = hiMin > 100
        ? `<span class="note">Enrollment can top 100% because some students are older or younger than the usual school age.</span>`
        : "";
      el.html(
        `In ${state.year}, <strong>${rows.length}</strong> countries reported both measures. ` +
        `The third of countries with the <em>lowest</em> ${noun} (under ${fmt0(loMax)}%) had a typical (median) ` +
        `<strong>${fmt1(d3.median(lo, (d) => d.fertility))}</strong> births per woman, versus ` +
        `<strong>${fmt1(d3.median(hi, (d) => d.fertility))}</strong> in the third with the <em>highest</em> (over ${fmt0(hiMin)}%).` +
        `${note}` +
        `<span class="note">Correlation <strong>r = ${fmt2(r)}</strong>: more enrollment goes with fewer births, but this alone doesn't show cause.</span>`
      );
    }

    const cm = { top: 14, right: 12, bottom: 30, left: 38 };
    const cw = 340, chh = 200;
    const ciw = cw - cm.left - cm.right, cih = chh - cm.top - cm.bottom;
    const csvg = d3.select("#corr").append("svg").attr("viewBox", `0 0 ${cw} ${chh}`)
      .attr("role", "img").attr("aria-label", "Correlation between enrollment and fertility over time");
    const cg = csvg.append("g").attr("transform", `translate(${cm.left},${cm.top})`);
    const cx = d3.scaleLinear().range([0, ciw]);
    const cy = d3.scaleLinear().domain([-1, -0.4]).range([cih, 0]);
    const cxAxis = cg.append("g").attr("class", "axis").attr("transform", `translate(0,${cih})`);
    cg.append("g").attr("class", "axis").call(d3.axisLeft(cy).ticks(5));
    cg.append("g").attr("class", "grid").call(d3.axisLeft(cy).ticks(5).tickSize(-ciw).tickFormat(""));
    const cpath = cg.append("path").attr("class", "corr-line");
    const cmarker = cg.append("line").attr("class", "corr-marker").attr("y1", 0).attr("y2", cih);
    const cdot = cg.append("circle").attr("class", "corr-dot").attr("r", 4.5);
    const cval = cg.append("text").attr("class", "corr-value");
    const cpick = cg.append("rect").attr("width", ciw).attr("height", cih)
      .attr("fill", "transparent").style("cursor", "ew-resize").style("touch-action", "none");

    function pickYear(event) {
      const [px] = d3.pointer(event, cg.node());
      const target = Math.round(cx.invert(px));
      const ys = years[state.measure];
      const nearest = ys.reduce((a, b) => (Math.abs(b - target) < Math.abs(a - target) ? b : a));
      stopPlay();
      setYear(nearest, 150);
    }
    cpick.on("pointerdown", pickYear).on("pointermove", (event) => { if (event.buttons === 1) pickYear(event); });

    function drawCorr() {
      const series = corr[state.measure];
      cx.domain(d3.extent(series, (d) => d.year));
      cxAxis.call(d3.axisBottom(cx).ticks(6).tickFormat(d3.format("d")));
      cpath.attr("d", d3.line().x((d) => cx(d.year)).y((d) => cy(d.r))(series));
      updateCorrMarker();
    }
    function updateCorrMarker() {
      const series = corr[state.measure];
      const cur = series.find((d) => d.year === state.year);
      if (!cur) { cmarker.attr("opacity", 0); cdot.attr("opacity", 0); cval.text(""); return; }
      cmarker.attr("opacity", 1).attr("x1", cx(cur.year)).attr("x2", cx(cur.year));
      cdot.attr("opacity", 1).attr("cx", cx(cur.year)).attr("cy", cy(cur.r));
      cval.attr("x", cx(cur.year) + (cx(cur.year) > ciw - 60 ? -8 : 8))
        .attr("text-anchor", cx(cur.year) > ciw - 60 ? "end" : "start")
        .attr("y", Math.max(cy(cur.r) - 10, 10)).text("r = " + fmt2(cur.r));
    }

    function render(dur) {
      const rows = rowsAt(state.measure, state.year);
      yearOut.text(state.year);
      watermark.text(state.year);
      emptyMsg.text(rows.length ? "" : "No data for this measure in " + state.year);
      drawDots(rows, dur);
      drawPinned(rows, dur);
      updateTakeaway(rows);
      updateCorrMarker();
    }

    function setYear(y, dur) {
      state.year = y;
      slider.property("value", y);
      render(dur === undefined ? 400 : dur);
    }

    function startPlay() {
      const ys = years[state.measure];
      const last = ys[ys.length - 1];
      if (state.year >= last) setYear(ys[0], 0);
      state.playing = true;
      playBtn.text("❚❚ Pause").attr("aria-pressed", "true");
      timer = d3.interval(() => {
        if (state.year >= last) { stopPlay(); return; }
        setYear(state.year + 1, 600);
      }, 650);
    }
    function stopPlay() {
      state.playing = false;
      if (timer) { timer.stop(); timer = null; }
      playBtn.text("▶ Play").attr("aria-pressed", "false");
    }
    playBtn.on("click", () => (state.playing ? stopPlay() : startPlay()));

    slider.on("input", function () {
      stopPlay();
      setYear(+this.value, 200);
    });

    d3.select("#measure").on("change", function () {
      stopPlay();
      state.measure = this.value;
      const m = MEASURES[state.measure];
      const ys = years[state.measure];
      slider.attr("min", ys[0]).attr("max", ys[ys.length - 1]);
      state.year = Math.max(ys[0], Math.min(ys[ys.length - 1], state.year));
      slider.property("value", state.year);
      chart.setMeasure(m.key, xDomains[state.measure], m.axis);
      drawCorr();
      render(500);
    });

    function togglePin(code) {
      if (state.pinned.has(code)) state.pinned.delete(code); else state.pinned.add(code);
      refreshChips();
      render(0);
    }
    function refreshChips() {
      const box = d3.select("#chips");
      const codes = Array.from(state.pinned);
      box.selectAll(".muted").remove();
      box.selectAll("button.chip").data(codes, (c) => c).join("button")
        .attr("type", "button").attr("class", "chip")
        .attr("aria-label", (c) => "Unpin " + codeToName.get(c))
        .text((c) => shortName(codeToName.get(c)) + " ×")
        .on("click", (event, c) => togglePin(c));
      if (!codes.length) box.append("span").attr("class", "muted").text("none yet");
    }

    function searchCountry() {
      const input = d3.select("#search");
      const q = input.property("value").trim().toLowerCase();
      if (!q) return;
      let code = nameToCode.get(q);
      if (!code) {
        const hit = Array.from(nameToCode.keys()).find((n) => n.startsWith(q));
        code = hit && nameToCode.get(hit);
      }
      if (code && !state.pinned.has(code)) togglePin(code);
      input.property("value", "");
    }
    d3.select("#search").on("change", searchCountry)
      .on("keydown", (event) => { if (event.key === "Enter") searchCountry(); });

    d3.select("#clear").on("click", () => {
      state.pinned.clear();
      refreshChips();
      render(0);
    });

    (function start() {
      const ys = years.sec;
      slider.attr("min", ys[0]).attr("max", ys[ys.length - 1]);
      state.year = 1970 < ys[0] ? ys[0] : 1970;
      slider.property("value", state.year);
      // initialize sample options
      ["West Bank and Gaza", "United States"].forEach((n) => {
        const c = nameToCode.get(n.toLowerCase());
        if (c) state.pinned.add(c);
      });
      refreshChips();
      drawCorr();
      render(0);
    })();
  }
})();
