/**
 * GitHub Integration for Autonomous Development
 * Provides functions to read, write, and commit code changes via GitHub API.
 */

const GITHUB_API_URL = "https://api.github.com";

interface GitHubFile {
  path: string;
  content: string;
  sha?: string;
}

interface CommitResult {
  success: boolean;
  commitSha?: string;
  error?: string;
}

interface FileContentsResult {
  success: boolean;
  content?: string;
  sha?: string;
  error?: string;
}

function getGitHubToken(): string {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN environment variable is not set");
  }
  return token;
}

function getRepoInfo(): { owner: string; repo: string } {
  // These can be configured via env vars or hardcoded for the SEO Max project
  const owner = process.env.GITHUB_OWNER || "your-org";
  const repo = process.env.GITHUB_REPO || "seo-max";
  return { owner, repo };
}

async function githubRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: string | null }> {
  try {
    const token = getGitHubToken();
    const response = await fetch(`${GITHUB_API_URL}${endpoint}`, {
      ...options,
      headers: {
        Accept: "application/vnd.github.v3+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { data: null, error: `GitHub API error (${response.status}): ${errorText}` };
    }

    const data = (await response.json()) as T;
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/**
 * Get the contents of a file from the repository.
 */
export async function getFileContents(path: string, branch = "main"): Promise<FileContentsResult> {
  const { owner, repo } = getRepoInfo();

  const { data, error } = await githubRequest<{
    content: string;
    sha: string;
    encoding: string;
  }>(`/repos/${owner}/${repo}/contents/${path}?ref=${branch}`);

  if (error || !data) {
    return { success: false, error: error || "File not found" };
  }

  // GitHub returns base64 encoded content
  const content = Buffer.from(data.content, "base64").toString("utf-8");

  return {
    success: true,
    content,
    sha: data.sha,
  };
}

/**
 * Get the contents of multiple files.
 */
export async function getMultipleFiles(
  paths: string[],
  branch = "main"
): Promise<Map<string, FileContentsResult>> {
  const results = new Map<string, FileContentsResult>();

  await Promise.all(
    paths.map(async (path) => {
      const result = await getFileContents(path, branch);
      results.set(path, result);
    })
  );

  return results;
}

/**
 * Create or update a file in the repository.
 */
export async function updateFile(
  path: string,
  content: string,
  message: string,
  branch = "main",
  sha?: string
): Promise<CommitResult> {
  const { owner, repo } = getRepoInfo();

  // If SHA not provided, try to get it (for updates)
  let fileSha = sha;
  if (!fileSha) {
    const existing = await getFileContents(path, branch);
    fileSha = existing.sha;
  }

  const body: Record<string, unknown> = {
    message,
    content: Buffer.from(content).toString("base64"),
    branch,
  };

  if (fileSha) {
    body.sha = fileSha;
  }

  const { data, error } = await githubRequest<{
    commit: { sha: string };
  }>(`/repos/${owner}/${repo}/contents/${path}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });

  if (error || !data) {
    return { success: false, error: error || "Failed to update file" };
  }

  return {
    success: true,
    commitSha: data.commit.sha,
  };
}

/**
 * Create a commit with multiple file changes.
 */
export async function createMultiFileCommit(
  files: GitHubFile[],
  message: string,
  branch = "main"
): Promise<CommitResult> {
  const { owner, repo } = getRepoInfo();

  try {
    // 1. Get the latest commit SHA for the branch
    const { data: refData, error: refError } = await githubRequest<{
      object: { sha: string };
    }>(`/repos/${owner}/${repo}/git/refs/heads/${branch}`);

    if (refError || !refData) {
      return { success: false, error: refError || "Failed to get branch ref" };
    }

    const latestCommitSha = refData.object.sha;

    // 2. Get the tree SHA from the latest commit
    const { data: commitData, error: commitError } = await githubRequest<{
      tree: { sha: string };
    }>(`/repos/${owner}/${repo}/git/commits/${latestCommitSha}`);

    if (commitError || !commitData) {
      return { success: false, error: commitError || "Failed to get commit" };
    }

    const baseTreeSha = commitData.tree.sha;

    // 3. Create blobs for each file
    const treeItems: Array<{
      path: string;
      mode: string;
      type: string;
      sha: string;
    }> = [];

    for (const file of files) {
      const { data: blobData, error: blobError } = await githubRequest<{
        sha: string;
      }>(`/repos/${owner}/${repo}/git/blobs`, {
        method: "POST",
        body: JSON.stringify({
          content: file.content,
          encoding: "utf-8",
        }),
      });

      if (blobError || !blobData) {
        return { success: false, error: blobError || `Failed to create blob for ${file.path}` };
      }

      treeItems.push({
        path: file.path,
        mode: "100644",
        type: "blob",
        sha: blobData.sha,
      });
    }

    // 4. Create a new tree
    const { data: treeData, error: treeError } = await githubRequest<{
      sha: string;
    }>(`/repos/${owner}/${repo}/git/trees`, {
      method: "POST",
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: treeItems,
      }),
    });

    if (treeError || !treeData) {
      return { success: false, error: treeError || "Failed to create tree" };
    }

    // 5. Create a new commit
    const { data: newCommitData, error: newCommitError } = await githubRequest<{
      sha: string;
    }>(`/repos/${owner}/${repo}/git/commits`, {
      method: "POST",
      body: JSON.stringify({
        message,
        tree: treeData.sha,
        parents: [latestCommitSha],
      }),
    });

    if (newCommitError || !newCommitData) {
      return { success: false, error: newCommitError || "Failed to create commit" };
    }

    // 6. Update the branch reference
    const { error: updateRefError } = await githubRequest(
      `/repos/${owner}/${repo}/git/refs/heads/${branch}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          sha: newCommitData.sha,
        }),
      }
    );

    if (updateRefError) {
      return { success: false, error: updateRefError };
    }

    return {
      success: true,
      commitSha: newCommitData.sha,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Get list of files in a directory.
 */
export async function listDirectory(
  path: string,
  branch = "main"
): Promise<{ success: boolean; files?: string[]; error?: string }> {
  const { owner, repo } = getRepoInfo();

  const { data, error } = await githubRequest<
    Array<{ name: string; type: string; path: string }>
  >(`/repos/${owner}/${repo}/contents/${path}?ref=${branch}`);

  if (error || !data) {
    return { success: false, error: error || "Directory not found" };
  }

  return {
    success: true,
    files: data.map((item) => item.path),
  };
}

/**
 * Get the tree of all files in the repository (for large file listings).
 */
export async function getRepositoryTree(
  branch = "main"
): Promise<{ success: boolean; files?: string[]; error?: string }> {
  const { owner, repo } = getRepoInfo();

  // Get branch SHA
  const { data: refData, error: refError } = await githubRequest<{
    object: { sha: string };
  }>(`/repos/${owner}/${repo}/git/refs/heads/${branch}`);

  if (refError || !refData) {
    return { success: false, error: refError || "Failed to get branch" };
  }

  // Get tree recursively
  const { data: treeData, error: treeError } = await githubRequest<{
    tree: Array<{ path: string; type: string }>;
  }>(`/repos/${owner}/${repo}/git/trees/${refData.object.sha}?recursive=1`);

  if (treeError || !treeData) {
    return { success: false, error: treeError || "Failed to get tree" };
  }

  // Filter to only files (not directories)
  const files = treeData.tree.filter((item) => item.type === "blob").map((item) => item.path);

  return { success: true, files };
}

/**
 * Get recent commits for the repository.
 */
export async function getRecentCommits(
  branch = "main",
  count = 10
): Promise<{
  success: boolean;
  commits?: Array<{ sha: string; message: string; date: string }>;
  error?: string;
}> {
  const { owner, repo } = getRepoInfo();

  const { data, error } = await githubRequest<
    Array<{
      sha: string;
      commit: { message: string; committer: { date: string } };
    }>
  >(`/repos/${owner}/${repo}/commits?sha=${branch}&per_page=${count}`);

  if (error || !data) {
    return { success: false, error: error || "Failed to get commits" };
  }

  return {
    success: true,
    commits: data.map((c) => ({
      sha: c.sha,
      message: c.commit.message,
      date: c.commit.committer.date,
    })),
  };
}
