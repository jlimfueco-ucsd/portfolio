// Lab 4.1.3.2
import { fetchJSON, renderProjects } from '../global.js';

// Lab 4.1.3.3
const projects = await fetchJSON('../lib/projects.json');

// Lab 4.1.3.4
const projectsContainer = document.querySelector('.projects');

// Lab 4.1.3.5
renderProjects(projects, projectsContainer, 'h2');
