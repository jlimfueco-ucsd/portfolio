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