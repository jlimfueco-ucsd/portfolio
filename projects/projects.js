// IMPORT FOR LAB5
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// Lab 4.1.3.2
import { fetchJSON, renderProjects } from '../global.js';

// Lab 4.1.3.3
const projects = await fetchJSON('../lib/projects.json');

// Lab 4.1.3.4
const projectsContainer = document.querySelector('.projects');

// Filter out hidden ones Lab 4.1.6
const visibleProjects = projects.filter(p => !p.hidden);

// Lab 4.1.3.5
renderProjects(visibleProjects, projectsContainer, 'h2');


// Lab 4.1.6 – Count projects and update the title
const titleElement = document.querySelector('.projects-title');
if (titleElement) {
  titleElement.textContent = `${visibleProjects.length} Projects`;
}

// // D3 LAB 5 START
// // svg in the project/index.html
// const color = d3.scaleSequential(d3.interpolateBlues);
// let data = [1, 2, 3, 4, 5];

// let total = 0;

// let angle = 0;
// let arcData = [];

// for (let d of data) {
//   let endAngle = angle + (d / total) * 2 * Math.PI;
//   arcData.push({ startAngle: angle, endAngle });
//   angle = endAngle;
// }


// // LAB 5.1.3
// let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);

// let arc = d3.arc().innerRadius(0).outerRadius(50)({
//   startAngle: 0,
//   endAngle: 2 * Math.PI,
// });

// let arcs = d3.pie()(data)

// arcs.forEach((arc, idx) => {
//   d3.select('svg')
//     .append('path')
//     .attr('d', arcGenerator(arc))
//     .attr('fill', color(idx));
// });

// D3 LAB 5 
// Use the same array you render with (prefer visible-only)
const source = (typeof visibleProjects !== 'undefined')
  ? visibleProjects
  : projects.filter(p => !p.hidden);

// 1) Aggregate counts by year: [{year, value}, ...]
const data = Array.from(
  d3.rollup(source, v => v.length, d => String(d.year)),
  ([year, value]) => ({ year, value })
).sort((a, b) => (+a.year) - (+b.year)); // numeric year sort

// 2) Select SVG and clear placeholder
const svg = d3.select('#projects-pie-plot');
svg.selectAll('circle').remove();

// 3) Scales + generators
const color = d3.scaleSequential(d3.interpolateCool)
  .domain([0, Math.max(1, data.length - 1)]);

const pie = d3.pie().value(d => d.value);
const arc = d3.arc().innerRadius(0).outerRadius(50);

const arcs = pie(data);
svg.selectAll('path')
  .data(arcs)
  .join('path')
  .attr('d', arc)
  .style('fill', (_, i) => color(i))   // <-- force inline fill style
  .attr('stroke', 'rgba(255,255,255,0.2)') // lighter border for dark bg
  .attr('stroke-width', 0.5);

// Lab 5.2/5.3 Legend
const legend = d3.select('.legend');

legend
  .selectAll('li')
  .data(pie(data)) // reuse same data used for pie arcs
  .join('li')
  .attr('style', (_, i) => `--color:${color(i)}`)
  .html(d => `
    <span class="swatch"></span>
    ${d.data.year} <em>(${d.data.value})</em>
  `);


// STILL LAB 5.4.4 WORK
// Sticky colors per year using d3.interpolateCool
// Build the domain from ALL years in the full dataset, sorted.
const BASE_YEARS = Array.from(new Set(projects.map(p => +p.year))).sort(d3.ascending);

// Map each year to a position in [0,1] along interpolateCool.
const COOL_COLORS = (function () {
  const n = BASE_YEARS.length;
  const stops = BASE_YEARS.map((_, i) => (n === 1 ? 0.5 : i / (n - 1)));
  return d3.scaleOrdinal()
    .domain(BASE_YEARS)
    .range(stops.map(t => d3.interpolateCool(t)));
})();

// expose as a global so other functions reuse it
window.colors = COOL_COLORS;   // colors(year) -> hex
window.state = window.state || { q: '', year: null };

// Lab 5.4.5
// Uses #projects-pie-plot (viewBox) and ul.legend
function renderPieChart(projectsGiven) {
  const svg = d3.select('#projects-pie-plot');   // your <svg id="projects-pie-plot">
  const legendUL = d3.select('ul.legend');       // your <ul class="legend">
  if (svg.empty()) return;

  // 1) roll up -> [{year, count}]
  const counts = d3.rollups(projectsGiven, v => v.length, d => d.year)
    .map(([year, count]) => ({ year: +year, count }))
    .sort((a, b) => d3.ascending(a.year, b.year));  // <-- FIX: use a.year, b.year

  // 2) read viewBox for sizing
  const vb = svg.node().viewBox?.baseVal;
  const w = (vb && vb.width)  || 100;
  const h = (vb && vb.height) || 100;
  const r = Math.min(w, h) / 2;

  // 3) color scale (reuse your global if present)
  const color = window.colors ?? window.color ?? d3.scaleOrdinal(d3.schemeTableau10);

  // 4) pie layout + arc
  const pie = d3.pie()
    .value(d => d.count)
    .sort((a, b) => d3.ascending(a.year, b.year));   // <-- FIX here too (sort comparator for data)

  const arc = d3.arc().innerRadius(0).outerRadius(r);

  // 5) clear and rebuild arcs
  svg.selectAll('*').remove();
  svg.append('g')
     .attr('class', 'pie-arcs')
     .attr('transform', `translate(0,0)`)            // viewBox centered at (0,0)
     .selectAll('path')
     .data(pie(counts), d => d.data.year)
     .join('path')
     .attr('d', arc)
     .attr('fill', d => color(d.data.year))
     .attr('stroke', 'rgba(255,255,255,0.2)')
     .attr('stroke-width', 0.5);

  // 5) Clear and rebuild arcs
  svg.selectAll('*').remove();
  svg.append('g')
    .attr('class', 'pie-arcs')
    .attr('transform', `translate(0,0)`)
    .selectAll('path')
    .data(pie(counts), d => d.data.year)
    .join('path')
      .attr('class', 'slice')                    // <-- ADD THIS
      .attr('d', arc)
      .attr('fill', d => color(d.data.year))
      .attr('stroke', 'rgba(255,255,255,0.2)')
      .attr('stroke-width', 0.5);

  // --- 5.5.2: click-to-select---
  if (!window.state) window.state = {};
  if (!('year' in state)) state.year = null;

  svg.selectAll('path.slice').on('click', (event, d) => {
    const y = d?.data?.year;
    state.year = (String(state.year) === String(y)) ? null : y;

    svg.selectAll('path.slice')
      .classed('selected', s => state.year && String(s.data.year) === String(state.year));

    d3.selectAll('.legend li.legend-item')
      .classed('selected', li => {
        const yr = (li && typeof li === 'object' && 'year' in li) ? li.year : li;
        return state.year && String(yr) === String(state.year);
      });

    // (later) hook this into your combined filter:
    // applySearch();
  });

  // 6) Legend: bind <li> directly to your UL
  legendUL
    .selectAll('li')
    .data(counts, d => d.year)
    .join(
      enter => enter.append('li')
        .attr('class', 'legend-item')            // <-- ADD THIS
        .attr('style', d => `--color:${color(d.year)}`)
        .html(d => `
          <span class="swatch"></span>
          <span class="legend-year">${d.year}</span>
          <em class="legend-count">(${d.count})</em>
        `),
      update => update
        .attr('class', 'legend-item')            // <-- AND HERE
        .attr('style', d => `--color:${color(d.year)}`)
        .html(d => `
          <span class="swatch"></span>
          <span class="legend-year">${d.year}</span>
          <em class="legend-count">(${d.count})</em>
        `),
      exit => exit.remove()
    );
    // end 5.5.2 / 5.5.3 work
}


// Lab 5.4 Search Bar
// --- Live search (title OR description) + re-render pie ---
function applySearch(v) {
  const q = (v || '').trim().toLowerCase();
  const filtered = q
    ? projects.filter(p =>
        (p.title || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
        // (p.year || '').toLowerCase().includes(q)
      )
    : projects;

  renderProjects(filtered, projectsContainer, 'h2');
  renderPieChart(filtered);
}



const searchInput = document.querySelector('.searchBar');
searchInput.addEventListener('input',  e => applySearch(e.target.value));
searchInput.addEventListener('search', e => applySearch(e.target.value));

renderPieChart(projects);

