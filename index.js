// Lab 4.2.1.2
import { fetchJSON, renderProjects, fetchGitHubData} from './global.js';

// Lab 4.2.1.3
const projects = await fetchJSON('./lib/projects.json');
const latestProjects = projects.slice(0, 3);

// Lab 4.2.1.4
const projectsContainer = document.querySelector('.projects');

// Lab 4.2.1.5
renderProjects(latestProjects, projectsContainer, 'h2');

// Lab 4.3.3
const githubData = await fetchGitHubData('jlimfueco-ucsd');
document.querySelector('#gh-followers').textContent = githubData?.followers ?? 0;
document.querySelector('#gh-following').textContent = githubData?.following ?? 0;
document.querySelector('#gh-repos').textContent     = githubData?.public_repos ?? 0;
document.querySelector('#gh-gists').textContent     = githubData?.public_gists ?? 0;


// Lab 4.3.4
const profileStats = document.querySelector('#profile-stats');
// Lab 4.3.5
if (profileStats) {
  profileStats.innerHTML = `
        <h2>My GitHub Stats</h2>
        <dl>
          <dt>Public Repos:</dt><dd>${githubData.public_repos}</dd>
          <dt>Public Gists:</dt><dd>${githubData.public_gists}</dd>
          <dt>Followers:</dt><dd>${githubData.followers}</dd>
          <dt>Following:</dt><dd>${githubData.following}</dd>
        </dl>
    `;
}

