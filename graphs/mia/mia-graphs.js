// Visuals 5 and 6: why populations are aging
// Visual 5: fertility rate over time, one line per region
// Visual 6: fertility rate vs. share of people 65+, one circle per country, for one year

// Where the CSV files are, relative to the dashboard page (dashboard/index.html)
const MIA_DATA = "../graphs/mia/";

// Both charts use the same size. The SVG stretches to fit its card.
const MIA_W = 520;
const MIA_H = 420;

const MIA_REGIONS = [
  "East Asia & Pacific",
  "Europe & Central Asia",
  "Latin America & Caribbean",
  "Middle East & North Africa",
  "North America",
  "South Asia",
  "Sub-Saharan Africa",
];

// One color per region, shared by both charts
const miaColor = d3.scaleOrdinal()
  .domain(MIA_REGIONS)
  .range(d3.schemeTableau10);

// Draws the color legend under a chart, in two columns
function miaLegend(svg, top) {
  const item = svg.selectAll(".mia-legend")
    .data(MIA_REGIONS)
    .join("g")
    .attr("class", "mia-legend")
    .attr("transform", (d, i) => `translate(${60 + (i % 2) * 220}, ${top + Math.floor(i / 2) * 20})`);

  item.append("circle")
    .attr("r", 5)
    .attr("fill", d => miaColor(d));

  item.append("text")
    .attr("x", 10)
    .attr("dy", "0.35em")
    .attr("font-size", 12)
    .text(d => d);
}

// Filled in once Visual 5's data loads; called when the dashboard's year changes
let updateVisual5Year;

// Reads the year shown in the dashboard's shared year controls
function miaSelectedYear() {
  const yearText = document.getElementById("selected-year");
  const slider = document.getElementById("year-slider");
  let year = 2019;
  if (yearText && !isNaN(+yearText.textContent.trim())) year = +yearText.textContent.trim();
  else if (slider) year = +slider.value;
  return Math.min(Math.max(year, 1960), 2019);   // our data covers 1960-2019
}

// Our own tooltip box. "position: fixed" floats it over the page,
// so showing or moving it never changes the page's layout.
const miaTip = d3.select("body")
  .append("div")
  .style("position", "fixed")
  .style("pointer-events", "none")
  .style("opacity", 0)
  .style("z-index", 1000)
  .style("background", "white")
  .style("border", "1px solid #ccc")
  .style("border-radius", "6px")
  .style("padding", "8px 10px")
  .style("font", "12px sans-serif")
  .style("line-height", "1.4")
  .style("box-shadow", "0 2px 8px rgba(0, 0, 0, 0.15)");

function miaShowTip(event, html) {
  miaTip.html(html).style("opacity", 1);

  // Show it right of the mouse, or left of it if it would run off the screen
  const box = miaTip.node().getBoundingClientRect();
  let left = event.clientX + 14;
  if (left + box.width > window.innerWidth) left = event.clientX - box.width - 14;

  miaTip.style("left", left + "px")
    .style("top", event.clientY - 10 + "px");
}

function miaHideTip() {
  miaTip.style("opacity", 0);
}

// Adds x and y axes with titles
function miaAxes(svg, x, y, margin, xTitle, yTitle, xFormat) {
  const xAxis = d3.axisBottom(x).ticks(6);
  if (xFormat) xAxis.tickFormat(xFormat);

  svg.append("g")
    .attr("transform", `translate(0, ${y.range()[0]})`)
    .call(xAxis);

  svg.append("g")
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(y).ticks(6));

  svg.append("text")
    .attr("x", (x.range()[0] + x.range()[1]) / 2)
    .attr("y", y.range()[0] + 38)
    .attr("text-anchor", "middle")
    .attr("font-size", 13)
    .text(xTitle);

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -(y.range()[0] + y.range()[1]) / 2)
    .attr("y", 16)
    .attr("text-anchor", "middle")
    .attr("font-size", 13)
    .text(yTitle);
}

// ---------- Visual 5: fertility over time by region ----------

d3.csv(MIA_DATA + "fertility_by_region.csv").then(function (data) {
  const margin = { top: 20, right: 20, bottom: 140, left: 56 };

  const rows = data.map(d => ({
    region: d.region,
    year: +d.year,
    fertility: +d.fertility,
  }));

  // One group of rows per region (the file is already sorted by year)
  const byRegion = d3.group(rows, d => d.region);

  const x = d3.scaleLinear()
    .domain(d3.extent(rows, d => d.year))
    .range([margin.left, MIA_W - margin.right]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(rows, d => d.fertility)]).nice()
    .range([MIA_H - margin.bottom, margin.top]);


  const svg = d3.select("#visual-5")
    .append("svg")
    .attr("viewBox", `0 0 ${MIA_W} ${MIA_H}`)
    .attr("width", "100%");

  miaAxes(svg, x, y, margin, "Year", "Births per woman", d3.format("d"));

  // Dashed line at 2.1: the "replacement rate" needed to keep a population steady
  svg.append("line")
    .attr("x1", margin.left)
    .attr("x2", MIA_W - margin.right)
    .attr("y1", y(2.1))
    .attr("y2", y(2.1))
    .attr("stroke", "#888")
    .attr("stroke-dasharray", "4 4");

  const line = d3.line()
    .x(d => x(d.year))
    .y(d => y(d.fertility));

  svg.selectAll(".mia-line")
    .data(byRegion)
    .join("path")
    .attr("class", "mia-line")
    .attr("fill", "none")
    .attr("stroke", ([region]) => miaColor(region))
    .attr("stroke-width", 2)
    .attr("d", ([region, values]) => line(values));

  const legendTop = MIA_H - margin.bottom + 64;
  miaLegend(svg, legendTop);

  // Explain the dashed line in the empty 8th legend spot
  const note = svg.append("g")
    .attr("transform", `translate(${60 + 220}, ${legendTop + 3 * 20})`);

  note.append("line")
    .attr("x1", -6)
    .attr("x2", 6)
    .attr("stroke", "#888")
    .attr("stroke-dasharray", "3 2");

  note.append("text")
    .attr("x", 10)
    .attr("dy", "0.35em")
    .attr("font-size", 12)
    .text("Replacement rate (2.1)");

  // Hover: wide invisible copies of the lines, so they're easy to point at
  svg.selectAll(".mia-hit")
    .data(byRegion)
    .join("path")
    .attr("class", "mia-hit")
    .attr("fill", "none")
    .attr("stroke", "transparent")
    .attr("stroke-width", 12)
    .attr("d", ([region, values]) => line(values))
    .on("mousemove", function (event, [region, values]) {
      const [mouseX] = d3.pointer(event, svg.node());
      const year = Math.round(x.invert(mouseX));
      const point = values.find(d => d.year === year);
      svg.selectAll(".mia-line")
        .attr("stroke-opacity", ([r]) => (r === region ? 1 : 0.15));
      if (point) {
        miaShowTip(event, `<strong>${region}</strong><br>${year}: ${point.fertility.toFixed(1)} births per woman`);
      }
    })
    .on("mouseleave", function () {
      svg.selectAll(".mia-line").attr("stroke-opacity", 1);
      miaHideTip();
    });

  // Year marker: a vertical line and a dot on each region's line
  const marker = svg.append("line")
    .attr("y1", margin.top)
    .attr("y2", MIA_H - margin.bottom)
    .attr("stroke", "#333")
    .attr("stroke-opacity", 0.35)
    .attr("pointer-events", "none");

  const markerDots = svg.append("g")
    .attr("pointer-events", "none");

  updateVisual5Year = function (year) {
    marker.attr("x1", x(year)).attr("x2", x(year));

    markerDots.selectAll("circle")
      .data(rows.filter(d => d.year === year), d => d.region)
      .join("circle")
      .attr("r", 4)
      .attr("fill", d => miaColor(d.region))
      .attr("stroke", "white")
      .attr("cx", d => x(d.year))
      .attr("cy", d => y(d.fertility));
  };

  updateVisual5Year(miaSelectedYear());    
});

// ---------- Visual 6: fertility vs. population 65+ for one year ----------

let updateVisual6;   // filled in once the data loads; call updateVisual6(year) to change years

d3.csv(MIA_DATA + "fertility_vs_aging.csv").then(function (data) {
  const margin = { top: 20, right: 20, bottom: 140, left: 56 };

  const rows = data.map(d => ({
    country: d.country,
    region: d.region,
    year: +d.year,
    fertility: +d.fertility,
    age65: +d.age65,
  }));
      // Axes cover ALL years, so they stay fixed when the year changes
  const x = d3.scaleLinear()
    .domain([0, d3.max(rows, d => d.fertility)]).nice()
    .range([margin.left, MIA_W - margin.right]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(rows, d => d.age65)]).nice()
    .range([MIA_H - margin.bottom, margin.top]);

  const svg = d3.select("#visual-6")
    .append("svg")
    .attr("viewBox", `0 0 ${MIA_W} ${MIA_H}`)
    .attr("width", "100%");

  // Big faded year in the background
  const yearLabel = svg.append("text")
    .attr("x", MIA_W - margin.right - 8)
    .attr("y", margin.top + 50)
    .attr("text-anchor", "end")
    .attr("font-size", 56)
    .attr("font-weight", "bold")
    .attr("fill", "#e5e5e5");

  miaAxes(svg, x, y, margin, "Births per woman", "Population aged 65+ (%)");
  miaLegend(svg, MIA_H - margin.bottom + 64);

  const dots = svg.append("g");

  // Redraws the circles for one year
  updateVisual6 = function (year) {
    const yearRows = rows.filter(d => d.year === year);

    yearLabel.text(year);

    dots.selectAll("circle")
      .data(yearRows, d => d.country)      // match circles to countries by name
      .join("circle")
      .attr("r", 4.5)
      .attr("fill", d => miaColor(d.region))
      .attr("fill-opacity", 0.75)
            .on("mouseover", function (event, d) {
        d3.select(this).attr("stroke", "#222").attr("stroke-width", 1.5);
        miaShowTip(event, `<strong>${d.country}</strong> (${d.year})<br>${d.fertility.toFixed(1)} births per woman<br>${d.age65.toFixed(1)}% aged 65+`);
      })
      .on("mouseout", function () {
        d3.select(this).attr("stroke", null);
        miaHideTip();
      })
      .transition()
      .duration(300)
      .attr("cx", d => x(d.fertility))
      .attr("cy", d => y(d.age65));
  };

    updateVisual6(miaSelectedYear());
});

// ---------- Follow the dashboard's shared year slider and Play button ----------

function miaOnYearChange() {
  const year = miaSelectedYear();
  if (updateVisual5Year) updateVisual5Year(year);
  if (updateVisual6) updateVisual6(year);
}

// Dragging the slider
const miaSlider = document.getElementById("year-slider");
if (miaSlider) miaSlider.addEventListener("input", miaOnYearChange);

// Play button: main.js changes the big year number, so watch that number for changes
const miaYearText = document.getElementById("selected-year");
if (miaYearText) {
  new MutationObserver(miaOnYearChange)
    .observe(miaYearText, { childList: true, characterData: true, subtree: true });
}