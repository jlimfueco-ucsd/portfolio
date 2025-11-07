import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// 6.5.1
// === 6.5 Setup ===
const margin = { top: 20, right: 20, bottom: 40, left: 48 };
const width  = 800, height = 420;

const svg = d3.select('#chart').selectAll('svg').data([null]).join('svg')
  .attr('width', width)
  .attr('height', height);

const x = d3.scaleLinear().range([margin.left, width - margin.right]);
const y = d3.scaleLinear().range([height - margin.bottom, margin.top]);

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


// Keep SVG z-order predictable: grid < dots < brush < axes
function createLayers(svg) {
  const gGrid  = svg.selectAll('g.grid').data([null]).join('g').attr('class','grid');
  const gDots  = svg.selectAll('g.dots').data([null]).join('g').attr('class','dots');
  const gBrush = svg.selectAll('g.brush').data([null]).join('g').attr('class','brush');
  const gAxes  = svg.selectAll('g.axes').data([null]).join('g').attr('class','axes');
  return { gGrid, gDots, gBrush, gAxes };
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
  // const xAxis = d3.axisBottom(xScale)
  //   .ticks(d3.timeDay.every(6))
  //   .tickFormat(d3.timeFormat('%b %d'));

  // ----- FIXED X-AXIS (UTC, anchored every 6 days) -----

  // Get the current xScale’s domain
  const [xmin, xmax] = xScale.domain();

  // Start ticks at the 1st of the min month (UTC)
  const tickStart = new Date(Date.UTC(xmin.getUTCFullYear(), xmin.getUTCMonth(), 1));

  // End ticks at the next rounded-up day (UTC)
  const tickEnd = d3.utcDay.ceil(xmax);

  // Generate tick positions every 6 days
  const xTickValues = d3.utcDay.range(tickStart, tickEnd, 6);

  // Build the axis (use same xScale, just new tickValues)
  const xAxis = d3.axisBottom(xScale)
    .tickValues(xTickValues)
    .tickFormat(d3.utcFormat('%b %d'))
    .tickSizeOuter(0);

  // Remove any previous x-axis and draw a new one
  svg.selectAll('.axis.x-axis').remove();
  svg.append('g')
    .attr('class', 'axis x-axis')
    .attr('transform', `translate(0, ${usable.bottom})`)
    .call(xAxis);

  // ----- end FIXED X-AXIS -----


  const yAxis = d3.axisLeft(yScale)
    .tickValues(d3.range(0, 25, 2))
    .tickFormat(d => String(d).padStart(2, '0') + ':00');

  // svg.append('g')
  //   .attr('class', 'axis x-axis')
  //   .attr('transform', `translate(0,${usable.bottom})`)
  //   .call(xAxis);

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


// === 6.5 — Brush overlay aligned to g.dots bbox (no bottom gap) ===
function addBrushOverlay() {
  const svg = d3.select('#chart').select('svg');
  if (svg.empty()) return;

  const gDots  = svg.selectAll('g.dots').data([null]).join('g').attr('class','dots');
  const gBrush = svg.selectAll('g.brush').data([null]).join('g').attr('class','brush');
  gBrush.lower(); // keep under dots so hover still works

  // --- Read g.dots geometry & transform ---
  const bb = gDots.node().getBBox(); // rendered bbox of dots container
  const m  = gDots.node().transform?.baseVal?.consolidate()?.matrix;
  const tx = m ? m.e : 0;   // translation X of g.dots
  const ty = m ? m.f : 0;   // translation Y of g.dots

  // Brush lives in root SVG coords; extent matches g.dots bbox in root coords
  const extent = [[tx + bb.x,          ty + bb.y],
                  [tx + bb.x + bb.width, ty + bb.y + bb.height]];

  const brush = d3.brush()
    .extent(extent)
    .on('brush', brushed)
    .on('end',   ended);

  gBrush.attr('transform', null).call(brush);

  function brushed(event) {
    if (!event.selection) return;
    const [[x0, y0], [x1, y1]] = event.selection;

    const dots = gDots.selectAll('circle');
    const idx = [];
    const selected = [];

    dots.each(function(d, i) {
      // circle cx/cy are in g.dots LOCAL coords; convert to ROOT coords by adding tx,ty
      const cxAbs = (+this.getAttribute('cx')) + tx;
      const cyAbs = (+this.getAttribute('cy')) + ty;
      if (x0 <= cxAbs && cxAbs <= x1 && y0 <= cyAbs && cyAbs <= y1) {
        idx.push(i);
        selected.push(d); // d is your commit (has .lines)
      }
    });

    // style selected/faded
    const set = new Set(idx);
    dots.classed('selected', (_d, i) => set.has(i))
        .classed('faded',   (_d, i) => !set.has(i));

    // label
    const label = d3.select('#selection-count');
    if (!label.empty()) label.text(idx.length ? `${idx.length} selected` : 'No commits selected');

    // language panel
    renderLanguageBreakdownFromSelection(selected);
  }

  function ended(event) {
    if (!event.selection) {
      gBrush.call(brush.move, null);
      const dots = gDots.selectAll('circle');
      dots.classed('selected', false).classed('faded', false);
      const label = d3.select('#selection-count');
      if (!label.empty()) label.text('No commits selected');
      clearLanguageBreakdown();
      return;
    }
    gBrush.select('.selection').style('pointer-events', 'none'); // keep hover alive
  }
}

// Call once after your dots are drawn:
addBrushOverlay();

// === 6.5.6 helpers: language tally from commit.lines (rows from loc.csv) ===
const EXT_TO_LANG = new Map([
  ['js','JS'], ['ts','TS'], ['jsx','JS'], ['tsx','TS'],
  ['html','HTML'], ['css','CSS'],
  ['md','Markdown'], ['json','JSON'], ['yml','YAML'], ['yaml','YAML'],
  ['py','Python'], ['rb','Ruby'], ['java','Java'],
  ['c','C'], ['cpp','C++'], ['cc','C++'], ['h','C/C++'], ['hpp','C++'],
  ['cs','C#'], ['go','Go'], ['rs','Rust'], ['php','PHP'], ['sql','SQL']
]);

function extFromPath(p='') {
  const i = p.lastIndexOf('.');
  return i < 0 ? '' : p.slice(i+1).toLowerCase();
}
function langFromPath(p='') {
  const ext = extFromPath(p);
  return ext ? (EXT_TO_LANG.get(ext) ?? ext.toUpperCase()) : 'Other';
}

function renderLanguageBreakdownFromSelection(selectedCommits = []) {
  const dl = document.querySelector('#language-breakdown');
  if (!dl) return;

  const counts = new Map();
  let total = 0;

  for (const c of selectedCommits) {
    const rows = Array.isArray(c?.lines) ? c.lines : [];
    for (const r of rows) {
      const lang = langFromPath(r.file || '');
      counts.set(lang, (counts.get(lang) || 0) + 1);
      total += 1;
    }
  }

  dl.innerHTML = '';

  if (total === 0) {
    const dt = document.createElement('dt'); dt.textContent = 'Languages';
    const dd = document.createElement('dd'); dd.textContent = '—';
    dl.append(dt, dd);
    return;
  }

  const rows = Array.from(counts, ([lang, lines]) => ({
    lang, lines, pct: lines / total
  })).sort((a,b) => b.lines - a.lines);

  for (const { lang, lines, pct } of rows) {
    const dt = document.createElement('dt');
    dt.textContent = lang;

    const ddLines = document.createElement('dd');
    ddLines.className = 'lines';
    ddLines.textContent = `${lines.toLocaleString('en-US')} lines`;

    const ddPct = document.createElement('dd');
    ddPct.className = 'pct';
    const pctLabel = (pct * 100).toFixed(pct >= 0.095 ? 0 : 1) + '%';
    ddPct.textContent = `(${pctLabel})`;

    dl.append(dt, ddLines, ddPct);
  }

  // Total row (spans full width)
  const dtT = document.createElement('dt'); dtT.className = 'total'; dtT.textContent = 'Total Lines Edited';
  const ddT = document.createElement('dd'); ddT.className = 'total'; ddT.textContent = total.toLocaleString('en-US');
  dl.append(dtT, ddT);
}


function clearLanguageBreakdown() {
  const dl = document.querySelector('#language-breakdown');
  if (!dl) return;
  dl.innerHTML = '';
  const dt = document.createElement('dt'); dt.textContent = 'Languages';
  const dd = document.createElement('dd'); dd.textContent = '—';
  dl.append(dt, dd);
}

let data = await loadData();
let commits = processCommits(data);

clearLanguageBreakdown();
renderCommitInfo(data, commits);
renderScatterPlot(data, commits);
addBrushOverlay();

console.log('lookup →', (document.getElementById('commit-link').textContent), window.LINES_BY_COMMIT?.get(document.getElementById('commit-link').textContent));

console.log(commits);