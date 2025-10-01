import { Octokit } from '@octokit/rest';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

export async function getUncachableGitHubClient() {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

export async function createRepository(name: string, description: string, isPrivate: boolean = false) {
  const octokit = await getUncachableGitHubClient();
  
  try {
    const response = await octokit.repos.createForAuthenticatedUser({
      name,
      description,
      private: isPrivate,
      auto_init: true, // Initialize with README so repo isn't empty
    });
    
    return response.data;
  } catch (error: any) {
    if (error.status === 422 && error.message.includes('already exists')) {
      const user = await octokit.users.getAuthenticated();
      const username = user.data.login;
      const existingRepo = await octokit.repos.get({
        owner: username,
        repo: name,
      });
      return existingRepo.data;
    }
    throw error;
  }
}

export async function getUserInfo() {
  const octokit = await getUncachableGitHubClient();
  const response = await octokit.users.getAuthenticated();
  return response.data;
}

export async function pushFilesToRepo(owner: string, repo: string, files: Array<{ path: string; content: string }>) {
  const octokit = await getUncachableGitHubClient();

  // Step 1: Check if repository has any commits
  let latestCommitSha: string | undefined;
  let baseTreeSha: string | undefined;
  
  try {
    const { data: refData } = await octokit.git.getRef({
      owner,
      repo,
      ref: 'heads/main',
    });
    latestCommitSha = refData.object.sha;
    
    // Get the tree from the latest commit
    const { data: commitData } = await octokit.git.getCommit({
      owner,
      repo,
      commit_sha: latestCommitSha,
    });
    baseTreeSha = commitData.tree.sha;
  } catch (error) {
    console.log('No main branch found, will create initial commit');
  }

  // Step 2: Build the tree with all files
  const tree = files.map(file => ({
    path: file.path,
    mode: '100644' as const,
    type: 'blob' as const,
    content: file.content,
  }));

  const { data: treeData } = await octokit.git.createTree({
    owner,
    repo,
    tree,
    base_tree: baseTreeSha,
  });

  // Step 3: Create commit
  const { data: commitData } = await octokit.git.createCommit({
    owner,
    repo,
    message: 'Push from Replit - Grand Central',
    tree: treeData.sha,
    parents: latestCommitSha ? [latestCommitSha] : [],
  });

  // Step 4: Update or create reference
  if (latestCommitSha) {
    await octokit.git.updateRef({
      owner,
      repo,
      ref: 'heads/main',
      sha: commitData.sha,
    });
  } else {
    await octokit.git.createRef({
      owner,
      repo,
      ref: 'refs/heads/main',
      sha: commitData.sha,
    });
  }

  return commitData;
}
