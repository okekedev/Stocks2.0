import { Octokit } from '@octokit/rest';
import simpleGit from 'simple-git';
import fs from 'fs';
import path from 'path';
import { createTemplateFiles } from '../utils/templateUtils.js';

export class GitHubService {
  constructor(accessToken) {
    this.octokit = new Octokit({
      auth: accessToken,
    });
    this.accessToken = accessToken;
  }

  async createRepository(repoName, description = 'Azure Container Template', isPrivate = false) {
    try {
      const response = await this.octokit.rest.repos.createForAuthenticatedUser({
        name: repoName,
        description,
        private: isPrivate,
        auto_init: false, // We'll push our own content
        has_issues: true,
        has_projects: true,
        has_wiki: false,
      });

      return {
        success: true,
        repo: response.data,
        cloneUrl: response.data.clone_url,
        htmlUrl: response.data.html_url,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async pushTemplateFiles(repoName, githubUsername, templatePayload, workflowType = 'public', azureConfig = null) {
    const tempDir = path.join(process.cwd(), 'temp', repoName);
    
    try {
      // Create temporary directory
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true });
      }
      fs.mkdirSync(tempDir, { recursive: true });

      // Generate template files
      const templateFiles = await createTemplateFiles(templatePayload, workflowType, azureConfig);

      // Write files to temp directory
      for (const file of templateFiles) {
        const filePath = path.join(tempDir, file.path);
        const fileDir = path.dirname(filePath);
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(fileDir)) {
          fs.mkdirSync(fileDir, { recursive: true });
        }
        
        fs.writeFileSync(filePath, file.content);
      }

      // Initialize git and push
      const git = simpleGit(tempDir);
      const repoUrl = `https://${this.accessToken}@github.com/${githubUsername}/${repoName}.git`;

      await git.init();
      await git.addConfig('user.name', githubUsername);
      await git.addConfig('user.email', `${githubUsername}@users.noreply.github.com`);
      await git.add('.');
      await git.commit('Initial commit: Azure Container Template');
      await git.addRemote('origin', repoUrl);
      await git.push('origin', 'main', { '-u': null });

      // Cleanup temp directory
      fs.rmSync(tempDir, { recursive: true });

      return {
        success: true,
        message: 'Template files pushed successfully',
      };
    } catch (error) {
      // Cleanup on error
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true });
      }
      
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async updateWorkflow(repoName, githubUsername, workflowType, templatePayload, azureConfig = null) {
    try {
      // Get the current workflow file
      let currentWorkflow;
      try {
        const response = await this.octokit.rest.repos.getContent({
          owner: githubUsername,
          repo: repoName,
          path: '.github/workflows/build.yml',
        });
        currentWorkflow = response.data;
      } catch (error) {
        // Workflow doesn't exist, we'll create it
        currentWorkflow = null;
      }

      // Generate new workflow content
      const templateFiles = await createTemplateFiles(templatePayload, workflowType, azureConfig);
      const workflowFile = templateFiles.find(file => file.path === '.github/workflows/build.yml');
      
      if (!workflowFile) {
        throw new Error('Workflow template not found');
      }

      const commitMessage = `Update workflow: ${workflowType} configuration`;
      
      if (currentWorkflow) {
        // Update existing file
        await this.octokit.rest.repos.createOrUpdateFileContents({
          owner: githubUsername,
          repo: repoName,
          path: '.github/workflows/build.yml',
          message: commitMessage,
          content: Buffer.from(workflowFile.content).toString('base64'),
          sha: currentWorkflow.sha,
        });
      } else {
        // Create new file
        await this.octokit.rest.repos.createOrUpdateFileContents({
          owner: githubUsername,
          repo: repoName,
          path: '.github/workflows/build.yml',
          message: commitMessage,
          content: Buffer.from(workflowFile.content).toString('base64'),
        });
      }

      return {
        success: true,
        message: `Workflow updated to ${workflowType} configuration`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async makeRepositoryPrivate(repoName, githubUsername) {
    try {
      await this.octokit.rest.repos.update({
        owner: githubUsername,
        repo: repoName,
        private: true,
      });

      return {
        success: true,
        message: 'Repository is now private',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async updatePackageVisibility(packageName, githubUsername, visibility = 'private') {
    try {
      await this.octokit.rest.packages.updatePackageForAuthenticatedUser({
        package_type: 'container',
        package_name: packageName,
        visibility: visibility,
      });

      return {
        success: true,
        message: `Package visibility set to ${visibility}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getUserInfo() {
    try {
      const response = await this.octokit.rest.users.getAuthenticated();
      return {
        success: true,
        user: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}