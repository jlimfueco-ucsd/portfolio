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

// Lab 5.2 legend
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