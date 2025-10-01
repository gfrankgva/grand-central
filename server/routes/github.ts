import { Router } from 'express';
import { createRepository, getUserInfo, pushFilesToRepo } from '../services/github.js';
import { readdirSync, statSync, readFileSync } from 'fs';
import { join, relative } from 'path';

const router = Router();

router.get('/user', async (req, res) => {
  try {
    const user = await getUserInfo();
    res.json(user);
  } catch (error: any) {
    console.error('Error getting GitHub user:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/create-and-push', async (req, res) => {
  try {
    const { repoName, description, isPrivate } = req.body;
    
    if (!repoName) {
      return res.status(400).json({ error: 'Repository name is required' });
    }

    const repo = await createRepository(repoName, description || '', isPrivate || false);
    
    const user = await getUserInfo();
    const username = user.login;
    
    res.json({
      success: true,
      repoUrl: repo.html_url,
      message: `Repository created successfully! You can now push your code using: git remote add origin https://github.com/${username}/${repoName}.git && git push -u origin main`
    });
    
  } catch (error: any) {
    console.error('Error creating repository:', error);
    res.status(500).json({ error: error.message });
  }
});

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = join(dirPath, file);
    
    if (file === 'node_modules' || file === '.git' || file === '.cache' || 
        file === 'dist' || file === 'build' || file === '.next' || 
        file === 'attached_assets' || file === 'push-to-github.js') {
      return;
    }

    if (statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else {
      arrayOfFiles.push(filePath);
    }
  });

  return arrayOfFiles;
}

router.post('/push', async (req, res) => {
  try {
    const { owner, repo } = req.body;
    
    if (!owner || !repo) {
      return res.status(400).json({ error: 'Owner and repo are required' });
    }

    const projectRoot = process.cwd();
    const allFiles = getAllFiles(projectRoot);
    
    const files = allFiles.map(filePath => ({
      path: relative(projectRoot, filePath),
      content: readFileSync(filePath, 'utf-8'),
    }));

    console.log(`Pushing ${files.length} files to ${owner}/${repo}...`);
    
    const commit = await pushFilesToRepo(owner, repo, files);
    
    res.json({
      success: true,
      message: `Successfully pushed ${files.length} files to GitHub`,
      commitSha: commit.sha,
      commitUrl: commit.html_url,
    });
    
  } catch (error: any) {
    console.error('Error pushing to GitHub:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
