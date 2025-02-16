const simpleGit = require('simple-git');
const fs = require('fs');
const path = require('path');

const git = simpleGit();

async function generateCSV() {
  try {
    const log = await git.log();
    const commits = log.all;

    // CSV header with columns: commit, line, depth, length, date, time, timezone, datetime, author
    let csv = 'commit,line,depth,length,date,time,timezone,datetime,author\n';

    commits.forEach((commit, i) => {
      // Assume commit.date is in one of two formats.
      // If it contains spaces (e.g. "2023-02-28 12:34:56 +0000"), we split it.
      // Otherwise, we parse the ISO string.
      let datePart, timePart, timezone;
      if (commit.date.includes(' ')) {
        const parts = commit.date.split(' ');
        datePart = parts[0];
        timePart = parts[1];
        timezone = parts[2] || '+0000';
      } else {
        const d = new Date(commit.date);
        datePart = d.toISOString().split('T')[0];
        timePart = d.toISOString().split('T')[1].split('Z')[0];
        timezone = '+0000';
      }
      // Use a full ISO string as datetime
      const datetime = new Date(commit.date).toISOString();
      // For the CSV, assign:
      // - line: the row number (i+1)
      // - depth: always 0 (not used)
      // - length: length of the commit message (as a proxy for "lines" in this demo)
      const lineNumber = i + 1;
      const depth = 0;
      const length = commit.message.length;
      
      // Wrap string fields in quotes and build the CSV row
      const row = `"${commit.hash}",${lineNumber},${depth},${length},${datePart},${timePart},${timezone},${datetime},"${commit.author_name}"\n`;
      csv += row;
    });

    // Ensure the output folder (meta) exists
    const outputDir = path.join(__dirname, 'meta');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
    fs.writeFileSync(path.join(outputDir, 'loc.csv'), csv, 'utf8');
    console.log('CSV generated successfully at meta/loc.csv');
  } catch (error) {
    console.error('Error generating CSV:', error);
  }
}

generateCSV();
