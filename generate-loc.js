const simpleGit = require('simple-git');
const fs = require('fs');
const path = require('path');

const git = simpleGit();

async function generateCSV() {
  try {
    const log = await git.log();
    const commits = log.all;

    // CSV header with columns: commit, line, depth, length, files_changed, date, time, timezone, datetime, author, file
    let csv = 'commit,line,depth,length,files_changed,date,time,timezone,datetime,author,file\n';

    // Process each commit
    for (let i = 0; i < commits.length; i++) {
      const commit = commits[i];
      
      // Get detailed stats for this commit
      const commitStats = await git.show([
        commit.hash,
        '--stat',
        '--format=format:'  // Empty format to exclude commit message
      ]);
      
      // Get files changed in this commit - handle differently for initial commit
      let files = [];
      try {
        // For non-initial commits, compare with parent
        const changedFiles = await git.diff(['--name-only', `${commit.hash}^`, commit.hash]);
        files = changedFiles.split('\n').filter(filename => filename.trim().length > 0);
      } catch (error) {
        // For initial commit, just get all files
        try {
          const initialFiles = await git.raw(['ls-tree', '--name-only', '-r', commit.hash]);
          files = initialFiles.split('\n').filter(filename => filename.trim().length > 0);
        } catch (err) {
          console.log(`Could not get files for commit ${commit.hash.substring(0, 7)}. Using commit stats...`);
          // Extract file names from commit stats as fallback
          const statLines = commitStats.split('\n');
          for (const line of statLines) {
            // Extract file name - assuming it's at the beginning of the line
            const match = line.match(/^[\s]*([^\s|]+)/);
            if (match && match[1] && !match[1].includes('changed') && !match[1].includes('insertion') && !match[1].includes('deletion')) {
              files.push(match[1]);
            }
          }
        }
      }
      
      // Calculate the real depth by checking how many commits it's behind HEAD
      const depth = await calculateCommitDepth(commit.hash);
      
      // Parse the commit stats to get lines changed and files modified
      const { linesChanged, filesChanged } = parseCommitStats(commitStats);
      
      // Process date information
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
      
      // For each file, create a row in the CSV
      if (files.length === 0) {
        // If no files detected, add a dummy row
        const lineNumber = i + 1;
        const row = `"${commit.hash}",${lineNumber},${depth},${linesChanged},${filesChanged},${datePart},${timePart},${timezone},${datetime},"${commit.author_name}","unknown"\n`;
        csv += row;
      } else {
        files.forEach((file, fileIndex) => {
          // Determine how many lines per file (if exact data is unavailable, distribute evenly)
          const linesPerFile = Math.ceil(linesChanged / files.length);
          const lineNumber = i + 1 + fileIndex / 100;  // Use decimal for sub-lines
          
          // Wrap string fields in quotes and build the CSV row
          const row = `"${commit.hash}",${lineNumber},${depth},${linesPerFile},${filesChanged},${datePart},${timePart},${timezone},${datetime},"${commit.author_name}","${file}"\n`;
          csv += row;
        });
      }
      
      // Log progress
      console.log(`Processed commit ${i + 1}/${commits.length}: ${commit.hash.substring(0, 7)} with ${files.length} files`);
    }

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

// Calculate the depth of a commit (how many commits it's behind the HEAD)
async function calculateCommitDepth(commitHash) {
  try {
    // Get the count of commits between this commit and HEAD
    const revList = await git.raw(['rev-list', '--count', `${commitHash}..HEAD`]);
    return parseInt(revList.trim()) || 0;
  } catch (error) {
    console.error(`Error calculating depth for commit ${commitHash}:`, error);
    return 0;
  }
}

// Parse the commit stats to get lines changed and files modified
function parseCommitStats(statsOutput) {
  // Default values
  let linesChanged = 0;
  let filesChanged = 0;
  
  try {
    // Count files changed by counting lines that have file paths
    // This regex matches lines that likely contain a file path
    const fileLines = statsOutput.split('\n').filter(line => 
      line.match(/\|/) && !line.includes('files changed')
    );
    filesChanged = fileLines.length;
    
    // Extract total lines changed from the summary line
    // Example: " 5 files changed, 25 insertions(+), 10 deletions(-)"
    const summaryLine = statsOutput.split('\n').find(line => 
      line.includes('files changed') || 
      line.includes('file changed') ||
      line.includes('insertions') || 
      line.includes('deletions')
    );
    
    if (summaryLine) {
      // Extract insertions
      const insertionsMatch = summaryLine.match(/(\d+) insertion/);
      const insertions = insertionsMatch ? parseInt(insertionsMatch[1]) : 0;
      
      // Extract deletions
      const deletionsMatch = summaryLine.match(/(\d+) deletion/);
      const deletions = deletionsMatch ? parseInt(deletionsMatch[1]) : 0;
      
      // Total lines changed is the sum of insertions and deletions
      linesChanged = insertions + deletions;
    }
  } catch (error) {
    console.error('Error parsing commit stats:', error);
  }
  
  // Ensure we have at least 1 line and 1 file for each commit
  return { 
    linesChanged: Math.max(1, linesChanged), 
    filesChanged: Math.max(1, filesChanged) 
  };
}

// Run the function
generateCSV();