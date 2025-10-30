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


// D3 LAB 5 CHECK
const svg = d3.select('#projects-pie-plot');
svg.selectAll('circle').remove();

const data = [1, 2, 3, 4, 5];
const color = d3.scaleSequential(d3.interpolateBlues)
  .domain([0, data.length - 1]);

const pie = d3.pie().value(d => d);
const arc = d3.arc().innerRadius(0).outerRadius(50);

svg.selectAll('path')
  .data(pie(data))
  .join('path')
  .attr('d', arc)
  .attr('fill', (_, i) => color(i))    // use sequential scale here
  .attr('stroke', 'rgba(0,0,0,.15)')
  .attr('stroke-width', 0.5);

const legend = d3.select('.legend');
legend.selectAll('li')
  .data(data)
  .join('li')
  .attr('style', (_, i) => `--color:${color(i)}`)
  .html((d, i) => `<span class="swatch"></span> Slice ${i + 1} <em>(${d})</em>`);