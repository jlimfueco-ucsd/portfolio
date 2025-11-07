import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// 6.1.1
async function loadData() {
  const data = await d3.csv('../loc.csv', (row) => ({
    ...row,
    line: Number(row.line), // or just +row.line
    depth: Number(row.depth),
    length: Number(row.length),
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));

  return data;
}

//6.1.2
function processCommits(data) {
  return d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      let first = lines[0];
      let { author, date, time, timezone, datetime } = first;
      let ret = {
        id: commit,
        url: 'https://github.com/jlimfueco-ucsd/portfolio/commit/' + commit,
        author,
        date,
        time,
        timezone,
        datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length,
      };

      Object.defineProperty(ret, 'lines', {
        value: lines,
        enumerable: false,
        writable: false,
        configurable: false
      });

      return ret;
    });
}

function renderCommitInfo(data, commits = []) {
  // defensive: ensure array
  const rows = Array.isArray(data) ? data : [];

  // --- NEW: lines edited per commit (7-char id) ---
  // Count rows in loc.csv for each commit; this is our “lines edited”
  const LINES_BY_COMMIT = d3.rollup(
    rows,
    v => v.length,
    d => (d.commit || '').slice(0, 7)
  );
  // make available to other functions (scatter/tooltip)
  window.LINES_BY_COMMIT = LINES_BY_COMMIT;

  // group by file and get the max line number in each file
  const maxLinePerFile = d3.rollup(
    rows,
    v => d3.max(v, d => +d.line || 0),
    d => d.file
  );

  const commitsCount = Array.isArray(commits) ? commits.length : 0;
  const filesCount   = maxLinePerFile.size;                 // unique files
  const totalLOC     = d3.sum(maxLinePerFile.values());     // sum of max lines per file
  const maxDepth     = d3.max(rows, d => +d.depth || 0) ?? 0;     // folder depth
  const longestLine  = d3.max(rows, d => +d.length || 0) ?? 0;    // character length
  const maxLines     = d3.max(maxLinePerFile.values()) ?? 0;       // most lines in a file

  const fmt = d3.format(',');

  d3.select('#sum-commits').text(fmt(commitsCount));
  d3.select('#sum-files').text(fmt(filesCount));
  d3.select('#sum-total').text(fmt(totalLOC));
  d3.select('#sum-depth').text(fmt(maxDepth));
  d3.select('#sum-longest-line').text(fmt(longestLine));
  d3.select('#sum-max-lines').text(fmt(maxLines));

  // optional: quick sanity log
  console.log('meta stats →', { commitsCount, filesCount, totalLOC, maxDepth, longestLine, maxLines, LINES_BY_COMMIT });
}

function renderScatterPlot(rows, commits) {
  const margin = { top: 10, right: 10, bottom: 30, left: 40 };
  const width = 1000, height = 600;

  // Clear previous plot
  d3.select('#chart').selectAll('svg').remove();

  // === Build global lookup once (commit → row count from loc.csv) ===
  if (!window.LINES_BY_COMMIT) {
    window.LINES_BY_COMMIT = d3.rollup(
      rows,
      v => v.length,                                   // count rows per commit
      d => String(d.commit).match(/[0-9a-f]{7,40}/i)?.[0]?.slice(0, 7) || ''
    );
  }

  // Sort commits for stability
  const sortedCommits = d3.sort(commits || [], d => -(d.totalLines ?? d.lines ?? 0));

  // Create SVG
  const svg = d3.select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  const usable = {
    left: margin.left,
    right: width - margin.right,
    top: margin.top,
    bottom: height - margin.bottom,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom
  };

  // Scales
  const xScale = d3.scaleTime()
    .domain(d3.extent(sortedCommits, d => d.datetime))
    .range([usable.left, usable.right])
    .nice();

  const yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([usable.bottom, usable.top]);

  // Compute lines edited per commit & attach
  function linesEditedFor(d) {
    const key7 = String(d.sha || d.id || d.commit || '')
                   .match(/[0-9a-f]{7,40}/i)?.[0]?.slice(0, 7) || '';
    return (
      d.totalLines ??
      d.linesEdited ??
      d.lines ??
      (window.LINES_BY_COMMIT ? window.LINES_BY_COMMIT.get(key7) : 0) ??
      0
    );
  }
  sortedCommits.forEach(d => { d._linesEdited = linesEditedFor(d); });

  const sExt = d3.extent(sortedCommits, d => d._linesEdited);
  const rScale = d3.scaleSqrt().domain([sExt[0] || 0, sExt[1] || 1]).range([2, 30]);

  // Gridlines (don’t block hover)
  const gGrid = svg.append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usable.left},0)`)
    .attr('pointer-events', 'none')
    .call(d3.axisLeft(yScale).tickFormat('').tickSize(-usable.width));

  // Axes
  const xAxis = d3.axisBottom(xScale)
    .ticks(d3.timeDay.every(6))
    .tickFormat(d3.timeFormat('%b %d'));

  const yAxis = d3.axisLeft(yScale)
    .tickValues(d3.range(0, 25, 2))
    .tickFormat(d => String(d).padStart(2, '0') + ':00');

  svg.append('g')
    .attr('class', 'axis x-axis')
    .attr('transform', `translate(0,${usable.bottom})`)
    .call(xAxis);

  svg.append('g')
    .attr('class', 'axis y-axis')
    .attr('transform', `translate(${usable.left},0)`)
    .call(yAxis);

  // Dots
  const gDots = svg.append('g').attr('class', 'dots');
  const dots = gDots.selectAll('circle')
    .data(sortedCommits)
    .join('circle')
      .attr('cx', d => xScale(d.datetime))
      .attr('cy', d => yScale(d.hourFrac))
      .attr('r',  d => rScale(d._linesEdited))
      .attr('fill', 'darkviolet')
      .style('fill-opacity', 0.7)
      .style('pointer-events', 'all');

  // Tooltip handling
  const tip = document.getElementById('commit-tooltip');
  const chartEl = document.getElementById('chart');

  function moveTooltip(evt) {
    const r = chartEl.getBoundingClientRect();
    const pad = 12, w = tip.offsetWidth, h = tip.offsetHeight;
    let x = evt.clientX - r.left + pad;
    let y = evt.clientY - r.top  + pad;
    x = Math.min(Math.max(x, 0), r.width  - w);
    y = Math.min(Math.max(y, 0), r.height - h);
    tip.style.left = x + 'px';
    tip.style.top  = y + 'px';
  }

  function showTip(d, evt) {
    renderTooltipContent(d);
    moveTooltip(evt);
    tip.classList.remove('is-hidden');
    tip.classList.add('is-visible');

    d3.select(chartEl).select('svg')
      .on('pointermove.tooltip', e => moveTooltip(e))
      .on('pointerleave.tooltip', () => hideTip());
  }

  function hideTip() {
    tip.classList.remove('is-visible');
    tip.classList.add('is-hidden');
    d3.select(chartEl).select('svg').on('.tooltip', null);
  }

  dots
    .on('pointerover',  (event, d) => {
      d3.select(event.currentTarget).style('fill-opacity', 1);
      showTip(d, event);
    })
    .on('pointermove',  (event) => moveTooltip(event))
    .on('pointerout',   (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      hideTip();
    });
}


function renderTooltipContent(commit) {
  const elLink   = document.getElementById('commit-link');
  const elDate   = document.getElementById('commit-date');
  const elTime   = document.getElementById('commit-time');
  const elAuthor = document.getElementById('commit-author');
  const elLines  = document.getElementById('commit-lines');
  if (!commit || typeof commit !== 'object') return;

  // --- commit id (normalize to 7 chars; your data uses `id`) ---
  const rawId = commit.id || commit.sha || commit.hash || commit.commit || '';
  const key7  = String(rawId).match(/[0-9a-f]{7,40}/i)?.[0]?.slice(0, 7) || '';

  // link + text
  const href = commit.html_url || commit.url || commit.commit?.url || '#';
  elLink.href = href;
  elLink.textContent = key7 || 'commit';

  // --- date/time ---
  const rawWhen = commit.datetime || commit.date || commit.timestamp ||
                  commit.commit?.author?.date || commit.commit?.committer?.date;
  const d  = rawWhen ? new Date(rawWhen) : null;
  const ok = d && !isNaN(+d);
  elDate.textContent = ok
    ? d.toLocaleDateString(undefined, { weekday:'long', year:'numeric', month:'long', day:'2-digit' })
    : (rawWhen || 'Unknown');
  elTime.textContent = ok
    ? d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' })
    : '—';

  // --- author ---
  const author = commit.author || commit.authorName || commit.name ||
                 commit.commit?.author?.name || commit.committer || 'Unknown';
  elAuthor.textContent = author;

  // --- Lines Edited ---
  // Prefer numeric fields; if `lines` is an array, use its length.
  let lines =
    commit.totalLines ??                         // <-- prefer this first
    commit.linesEdited ??
    (Array.isArray(commit.lines) ? commit.lines.length : commit.lines) ??
    (typeof commit.additions === 'number' && typeof commit.deletions === 'number'
      ? (commit.additions + commit.deletions)
      : undefined);

  // Fallback to CSV rollup keyed by the same 7-char id
  if (lines == null && window.LINES_BY_COMMIT) {
    lines = window.LINES_BY_COMMIT.get(key7);
  }

  // Final fallback from scatter’s precomputed value
  if (lines == null && typeof commit._linesEdited === 'number') {
    lines = commit._linesEdited;
  }

  elLines.textContent =
    (typeof lines === 'number' && isFinite(lines)) ? lines.toLocaleString() : '—';
}


let data = await loadData();
let commits = processCommits(data);

renderCommitInfo(data, commits);
renderScatterPlot(data, commits);
console.log('lookup →', (document.getElementById('commit-link').textContent), window.LINES_BY_COMMIT?.get(document.getElementById('commit-link').textContent));

console.log(commits);


// --- Diagnostic check for commit key matching ---
console.log('🔍 Checking commit keys vs loc.csv');

if (window.LINES_BY_COMMIT) {
  console.log('LINES_BY_COMMIT entries:', window.LINES_BY_COMMIT.size);

  // Print a few keys from loc.csv
  console.log('Sample keys from loc.csv:');
  console.log(Array.from(window.LINES_BY_COMMIT.keys()).slice(0, 10));
}

// If you have the commits array handy:
if (typeof commits !== 'undefined') {
  console.log('Sample commits (first 5):');
  commits.slice(0, 5).forEach((c, i) => {
    const raw = c.sha || c.id || c.commit || '';
    const key7 = String(raw).match(/[0-9a-f]{7,40}/i)?.[0]?.slice(0, 7) || '';
    const linesFromMap = window.LINES_BY_COMMIT?.get(key7);
    console.log(`#${i}`, { raw, key7, linesFromMap });
  });
}
