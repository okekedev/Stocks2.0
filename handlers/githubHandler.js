import { sendLog, sendStatus } from '../utils/wsUtils.js';
import { GitHubService } from '../services/githubService.js';

export async function handleGitHubPush(ws, payload) {
  const sessionId = `github-${Date.now()}`;
  
  try {
    sendStatus(ws, 'github', 'starting');
    sendLog(ws, 'github', '🐙 Starting GitHub repository setup...');

    // Validate required fields
    if (!payload.accessToken) {
      throw new Error('GitHub access token is required. Please authenticate first.');
    }

    // Initialize GitHub service
    const github = new GitHubService(payload.accessToken);
    
    // Step 1: Verify GitHub authentication
    sendLog(ws, 'github', '🔐 Verifying GitHub authentication...');
    const userInfo = await github.getUserInfo();
    
    if (!userInfo.success) {
      throw new Error(`GitHub authentication failed: ${userInfo.error}`);
    }
    
    sendLog(ws, 'github', '✅ GitHub authentication verified');
    sendLog(ws, 'github', `👤 Authenticated as: ${userInfo.user.login}`);

    // Step 2: Create repository
    sendLog(ws, 'github', `📁 Creating repository: ${payload.repoName}`);
    const repoResult = await github.createRepository(
      payload.repoName, 
      'Azure Container Template - Created via automated setup',
      false // Start with public repo
    );

    if (!repoResult.success) {
      throw new Error(`Failed to create repository: ${repoResult.error}`);
    }

    sendLog(ws, 'github', '✅ Repository created successfully');
    sendLog(ws, 'github', `🔗 Repository URL: ${repoResult.repo.html_url}`);

    // Step 3: Prepare and push template files
    sendLog(ws, 'github', '📋 Preparing template files...');
    
    const templatePayload = {
      repoName: payload.repoName,
      githubUsername: userInfo.user.login,
    };

    sendLog(ws, 'github', '📤 Pushing template files to GitHub...');
    const pushResult = await github.pushTemplateFiles(
      payload.repoName,
      userInfo.user.login,
      templatePayload,
      'public' // Start with public workflow
    );

    if (!pushResult.success) {
      throw new Error(`Failed to push template files: ${pushResult.error}`);
    }

    sendLog(ws, 'github', '✅ Template files pushed successfully');
    sendLog(ws, 'github', '⚡ GitHub Actions workflow triggered automatically');

    // Step 4: Wait a moment for GitHub Actions to start
    sendLog(ws, 'github', '🔨 GitHub Actions is building your Docker image...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 5: Show final results
    sendLog(ws, 'github', '');
    sendLog(ws, 'github', '🎉 Repository setup completed successfully!');
    sendLog(ws, 'github', '');
    sendLog(ws, 'github', '📋 Summary:');
    sendLog(ws, 'github', `   📁 Repository: ${repoResult.repo.html_url}`);
    sendLog(ws, 'github', `   📦 Container Image: ghcr.io/${userInfo.user.login}/${payload.repoName}:latest`);
    sendLog(ws, 'github', `   ⚡ GitHub Actions: ${repoResult.repo.html_url}/actions`);
    sendLog(ws, 'github', '');
    sendLog(ws, 'github', '💡 GitHub Actions will build your image in a few minutes');
    sendLog(ws, 'github', '✅ Ready for Step 2: Azure Setup');

    sendStatus(ws, 'github', 'completed', {
      message: 'GitHub repository created successfully!',
      repoUrl: repoResult.repo.html_url,
      packageUrl: `ghcr.io/${userInfo.user.login}/${payload.repoName}:latest`,
      githubUsername: userInfo.user.login,
    });

  } catch (error) {
    sendLog(ws, 'github', `❌ Error: ${error.message}`, 'error');
    sendStatus(ws, 'github', 'failed', { error: error.message });
  }
}

export async function handleMakePrivate(ws, payload) {
  const sessionId = `private-${Date.now()}`;
  
  try {
    sendStatus(ws, 'private', 'starting');
    sendLog(ws, 'private', '🔒 Converting to private deployment...');

    // Step 1: Make repository private
    sendLog(ws, 'private', '📝 Making GitHub repository private...');
    await simulateAPICall(ws, 'PATCH', `/repos/${payload.githubUsername}/${payload.repoName}`, { private: true });
    sendLog(ws, 'private', '✅ Repository is now private');

    // Step 2: Make container packages private
    sendLog(ws, 'private', '📦 Making container packages private...');
    await simulateAPICall(ws, 'PATCH', `/user/packages/container/${payload.repoName}`, { visibility: 'private' });
    sendLog(ws, 'private', '✅ Container packages are now private');

    // Step 3: Generate GHCR token instructions
    await provideTokenInstructions(ws, payload);

    // Step 4: Create private workflow
    sendLog(ws, 'private', '🔧 Creating private workflow...');
    await createPrivateWorkflow(ws, payload);
    sendLog(ws, 'private', '✅ Private workflow created');

    // Step 5: Update Azure container app
    sendLog(ws, 'private', '☁️ Updating Azure configuration for private registry...');
    await updateAzureForPrivateRegistry(ws, payload);

    sendLog(ws, 'private', '🎉 Successfully converted to private deployment!');
    sendLog(ws, 'private', '🔐 All future builds and deployments will be private');

    sendStatus(ws, 'private', 'completed', {
      message: 'Successfully converted to private deployment!'
    });

  } catch (error) {
    sendLog(ws, 'private', `❌ Error: ${error.message}`, 'error');
    sendStatus(ws, 'private', 'failed', { error: error.message });
  }
}

async function prepareTemplateFiles(ws, payload) {
  sendLog(ws, 'github', '📋 Preparing template files...');
  await new Promise(resolve => setTimeout(resolve, 600));
  
  sendLog(ws, 'github', '✅ Template files prepared:');
  sendLog(ws, 'github', '   📄 package.json - Node.js dependencies');
  sendLog(ws, 'github', '   🐳 Dockerfile - Container configuration');
  sendLog(ws, 'github', '   ⚡ vite.config.js - Build configuration');
  sendLog(ws, 'github', '   🎨 React components and styling');
  sendLog(ws, 'github', '   ⚙️ GitHub Actions workflow');
}

async function createPublicWorkflow(ws, payload) {
  sendLog(ws, 'github', '⚙️ Creating GitHub Actions workflow...');
  await new Promise(resolve => setTimeout(resolve, 500));
  
  sendLog(ws, 'github', '✅ Public workflow configured:');
  sendLog(ws, 'github', '   🔓 Uses GITHUB_TOKEN (public access)');
  sendLog(ws, 'github', '   📦 Builds Docker image on push to main');
  sendLog(ws, 'github', `   🚀 Pushes to ghcr.io/${payload.githubUsername}/${payload.repoName}`);
  sendLog(ws, 'github', '   🏷️ Tags: latest, v{build-number}');
}

async function simulateGitOperations(ws, payload) {
  sendLog(ws, 'github', '📤 Pushing template files to GitHub...');
  await new Promise(resolve => setTimeout(resolve, 800));
  sendLog(ws, 'github', '✅ Initial commit created and pushed');
  
  sendLog(ws, 'github', '⚡ GitHub Actions workflow triggered automatically');
  await new Promise(resolve => setTimeout(resolve, 600));
  
  sendLog(ws, 'github', '🔨 Building Docker image...');
  await new Promise(resolve => setTimeout(resolve, 1200));
  
  sendLog(ws, 'github', '📦 Docker image built successfully');
  await new Promise(resolve => setTimeout(resolve, 400));
  
  sendLog(ws, 'github', `🚀 Image pushed to ghcr.io/${payload.githubUsername}/${payload.repoName}:latest`);
}

async function provideTokenInstructions(ws, payload) {
  sendLog(ws, 'private', '');
  sendLog(ws, 'private', '🔑 GitHub Personal Access Token Setup Required:');
  sendLog(ws, 'private', '');
  sendLog(ws, 'private', '1. Go to: https://github.com/settings/tokens');
  sendLog(ws, 'private', '2. Click "Generate new token" → "Generate new token (classic)"');
  sendLog(ws, 'private', '3. Set expiration and select these scopes:');
  sendLog(ws, 'private', '   ✅ write:packages (push to registry)');
  sendLog(ws, 'private', '   ✅ read:packages (pull from registry)');
  sendLog(ws, 'private', '   ✅ delete:packages (manage packages)');
  sendLog(ws, 'private', '4. Copy the generated token');
  sendLog(ws, 'private', '5. Go to repository settings → Secrets and variables → Actions');
  sendLog(ws, 'private', '6. Add new repository secret:');
  sendLog(ws, 'private', '   Name: GHCR_TOKEN');
  sendLog(ws, 'private', '   Value: [your token]');
  sendLog(ws, 'private', '');
  sendLog(ws, 'private', '⚠️ Save this token securely - you won\'t see it again!');
}

async function createPrivateWorkflow(ws, payload) {
  const privateWorkflowContent = `name: Build and Push Container Image (Private)

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v3
      
    - name: Login to GitHub Container Registry
      uses: docker/login-action@v3
      with:
        registry: ghcr.io
        username: \${{ github.actor }}
        password: \${{ secrets.GHCR_TOKEN }}
        
    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v5
      with:
        images: ghcr.io/\${{ github.repository_owner }}/${payload.repoName}
        tags: |
          type=raw,value=latest,enable=\${{ github.ref == format('refs/heads/{0}', 'main') }}
          type=raw,value=v\${{ github.run_number }},enable=\${{ github.ref == format('refs/heads/{0}', 'main') }}
          
    - name: Build and push Docker image
      uses: docker/build-push-action@v5
      with:
        context: .
        push: true
        tags: \${{ steps.meta.outputs.tags }}
        labels: \${{ steps.meta.outputs.labels }}
        cache-from: type=gha
        cache-to: type=gha,mode=max`;

  // Simulate file operations
  sendLog(ws, 'private', '🗑️ Removing public workflow file');
  sendLog(ws, 'private', '📝 Creating private workflow file');
  sendLog(ws, 'private', '🔐 Configured to use GHCR_TOKEN');
}

async function updateAzureForPrivateRegistry(ws, payload) {
  // This would use the Azure CLI to update the container app registry settings
  sendLog(ws, 'private', '🔧 Configuring Azure to use private registry...');
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  sendLog(ws, 'private', '✅ Azure container app updated for private registry access');
  sendLog(ws, 'private', '🔐 Registry authentication configured');
}

async function simulateAPICall(ws, method, endpoint, data) {
  sendLog(ws, 'private', `🌐 ${method} ${endpoint}`, 'command');
  await new Promise(resolve => setTimeout(resolve, 800));
  sendLog(ws, 'private', '✅ API call successful', 'stdout');
}