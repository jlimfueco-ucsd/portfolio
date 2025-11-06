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

  // group by file and get the max line number in each file
  const maxLinePerFile = d3.rollup(
    rows,
    v => d3.max(v, d => +d.line || 0),
    d => d.file
  );

  const commitsCount = Array.isArray(commits) ? commits.length : 0;
  const filesCount   = maxLinePerFile.size;                                   // unique files
  const totalLOC     = d3.sum(maxLinePerFile.values());                       // sum of max lines per file
  const maxDepth     = d3.max(rows, d => +d.depth || 0) ?? 0;                 // folder depth
  const longestLine  = d3.max(rows, d => +d.length || 0) ?? 0;                // character length
  const maxLines     = d3.max(maxLinePerFile.values()) ?? 0;                  // most lines in any one file

  const fmt = d3.format(',');

  d3.select('#sum-commits').text(fmt(commitsCount));
  d3.select('#sum-files').text(fmt(filesCount));
  d3.select('#sum-total').text(fmt(totalLOC));
  d3.select('#sum-depth').text(fmt(maxDepth));
  d3.select('#sum-longest-line').text(fmt(longestLine));
  d3.select('#sum-max-lines').text(fmt(maxLines));

  // quick sanity log
  console.log('meta stats →', { commitsCount, filesCount, totalLOC, maxDepth, longestLine, maxLines });
}



let data = await loadData();
let commits = processCommits(data);

renderCommitInfo(data, commits);

console.log(commits);
