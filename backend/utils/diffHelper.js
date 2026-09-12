/**
 * SafeArchive Shared Diff Helper
 * Provides LCS (Longest Common Subsequence) diffing across files and commits.
 */

function computeLineDiff(oldStr, newStr) {
  const oldLines = !oldStr ? [] : oldStr.split(/\r?\n/);
  const newLines = !newStr ? [] : newStr.split(/\r?\n/);
  const m = oldLines.length;
  const n = newLines.length;
  const dp = Array.from({ length: m + 1 }, () => new Int32Array(n + 1));

  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (oldLines[i] === newLines[j]) {
        dp[i + 1][j + 1] = dp[i][j] + 1;
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const diffLines = [];
  let i = m;
  let j = n;
  let additions = 0;
  let deletions = 0;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      diffLines.unshift({ type: "common", text: oldLines[i - 1], oldLine: i, newLine: j });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      diffLines.unshift({ type: "added", text: newLines[j - 1], newLine: j });
      additions++;
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      diffLines.unshift({ type: "deleted", text: oldLines[i - 1], oldLine: i });
      deletions++;
      i--;
    }
  }

  return { lines: diffLines, additions, deletions };
}

/**
 * Compare two file sets (e.g. source branch vs target branch)
 * Returns file-by-file diffs and aggregate stats.
 */
function compareFileSets(sourceFiles, targetFiles) {
  const sourceMap = new Map();
  const targetMap = new Map();

  (sourceFiles || []).forEach((f) => sourceMap.set(f.path, f.content || ""));
  (targetFiles || []).forEach((f) => targetMap.set(f.path, f.content || ""));

  const allPaths = Array.from(new Set([...sourceMap.keys(), ...targetMap.keys()])).sort();

  const fileDiffs = [];
  let totalAdditions = 0;
  let totalDeletions = 0;

  for (const filePath of allPaths) {
    const hasSource = sourceMap.has(filePath);
    const hasTarget = targetMap.has(filePath);

    if (hasSource && !hasTarget) {
      // Added file
      const content = sourceMap.get(filePath);
      const diff = computeLineDiff("", content);
      totalAdditions += diff.additions;
      totalDeletions += diff.deletions;
      fileDiffs.push({
        path: filePath,
        status: "added",
        additions: diff.additions,
        deletions: diff.deletions,
        diffLines: diff.lines,
      });
    } else if (!hasSource && hasTarget) {
      // Deleted file
      const content = targetMap.get(filePath);
      const diff = computeLineDiff(content, "");
      totalAdditions += diff.additions;
      totalDeletions += diff.deletions;
      fileDiffs.push({
        path: filePath,
        status: "deleted",
        additions: diff.additions,
        deletions: diff.deletions,
        diffLines: diff.lines,
      });
    } else {
      // Both exist - compare content
      const oldContent = targetMap.get(filePath);
      const newContent = sourceMap.get(filePath);

      if (oldContent !== newContent) {
        const diff = computeLineDiff(oldContent, newContent);
        totalAdditions += diff.additions;
        totalDeletions += diff.deletions;
        fileDiffs.push({
          path: filePath,
          status: "modified",
          additions: diff.additions,
          deletions: diff.deletions,
          diffLines: diff.lines,
        });
      }
    }
  }

  return {
    files: fileDiffs,
    totalFilesChanged: fileDiffs.length,
    totalAdditions,
    totalDeletions,
  };
}

module.exports = {
  computeLineDiff,
  compareFileSets,
};
