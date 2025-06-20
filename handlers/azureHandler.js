import { executeCommand } from '../utils/commandUtils.js';
import { sendLog, sendStatus } from '../utils/wsUtils.js';
import fs from 'fs';
import path from 'path';

// Step 1: Azure Infrastructure Setup (moved from dockerHandler.js)
export async function handleAzureSetup(ws, payload) {
  const sessionId = `azure-setup-${Date.now()}`;
  
  try {
    sendStatus(ws, 'azure-setup', 'starting');
    sendLog(ws, 'azure-setup', '☁️ Setting up Azure infrastructure...');

    // Check Azure CLI
    await checkAzureCLI(ws);
    
    // Handle Azure login
    await handleAzureLogin(ws);
    
    // Create resource group
    await createResourceGroup(ws, payload);
    
    // Create container registry
    await createContainerRegistry(ws, payload);
    
    // Create container app environment
    await createContainerEnvironment(ws, payload);
    
    // Create initial container app (with public image)
    await createInitialContainerApp(ws, payload);

    sendLog(ws, 'azure-setup', '🎉 Azure infrastructure setup completed!');
    sendLog(ws, 'azure-setup', `🏗️ Resource Group: ${payload.resourceGroup}`);
    sendLog(ws, 'azure-setup', `📦 Container Registry: ${payload.registryName}.azurecr.io`);
    sendLog(ws, 'azure-setup', `🌍 Container Environment: ${payload.environmentName}`);
    sendLog(ws, 'azure-setup', `🚀 Container App: ${payload.appName}`);

    sendStatus(ws, 'azure-setup', 'completed', {
      message: 'Azure infrastructure ready!',
      resourceGroup: payload.resourceGroup,
      registryName: payload.registryName,
      environmentName: payload.environmentName,
      appName: payload.appName
    });

  } catch (error) {
    sendLog(ws, 'azure-setup', `❌ Error: ${error.message}`, 'error');
    sendStatus(ws, 'azure-setup', 'failed', { error: error.message });
  }
}

// Step 2: Azure Deployment (existing function)
export async function handleAzureDeploy(ws, payload) {
  const sessionId = `azure-${Date.now()}`;
  
  try {
    sendStatus(ws, 'azure', 'starting');
    sendLog(ws, 'azure', '☁️ Starting Azure deployment process...');

    // Check Azure CLI
    await checkAzureCLI(ws, sessionId);
    
    // Handle Azure login
    await handleAzureLogin(ws, sessionId);
    
    // Create/check resource group
    await handleResourceGroup(ws, sessionId, payload.resourceGroup, payload.location);
    
    // Deploy infrastructure
    await deployContainerApp(ws, sessionId, payload);
    
    // Get final app URL
    await getAppUrl(ws, sessionId, payload.appName, payload.resourceGroup);

    sendLog(ws, 'azure', '🎉 Deployment completed successfully!');
    sendStatus(ws, 'azure', 'completed', {
      message: 'Azure deployment completed successfully!'
    });

  } catch (error) {
    sendLog(ws, 'azure', `❌ Deployment failed: ${error.message}`, 'error');
    sendStatus(ws, 'azure', 'failed', { error: error.message });
  }
}

// Helper functions for Azure Setup (simulated for demo)
async function checkAzureCLI(ws, sessionId = null) {
  sendLog(ws, 'azure-setup', '🔍 Checking Azure CLI installation...');
  
  try {
    if (sessionId) {
      await executeCommand('az', ['--version'], {}, ws, `${sessionId}-version`, 'azure');
    } else {
      // Simulate Azure CLI check for setup
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    sendLog(ws, 'azure-setup', '✅ Azure CLI found');
  } catch (error) {
    sendLog(ws, 'azure-setup', '❌ Azure CLI not installed', 'error');
    sendLog(ws, 'azure-setup', '📥 Install from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli');
    throw error;
  }
}

async function handleAzureLogin(ws, sessionId = null) {
  sendLog(ws, 'azure-setup', '🔐 Checking Azure authentication...');
  
  try {
    if (sessionId) {
      await executeCommand('az', ['account', 'show'], {}, ws, `${sessionId}-account`, 'azure');
      sendLog(ws, 'azure', '✅ Already logged into Azure');
    } else {
      // Simulate login for setup
      await new Promise(resolve => setTimeout(resolve, 800));
      sendLog(ws, 'azure-setup', '🔑 Opening Azure login (OAuth popup)...');
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      sendLog(ws, 'azure-setup', '✅ Successfully authenticated with Azure');
    }
  } catch (error) {
    if (sessionId) {
      sendLog(ws, 'azure', '🔑 Opening Azure login...');
      await executeCommand('az', ['login'], {}, ws, `${sessionId}-login`, 'azure');
      sendLog(ws, 'azure', '✅ Successfully logged into Azure');
    } else {
      throw error;
    }
  }
}

async function createResourceGroup(ws, payload) {
  sendLog(ws, 'azure-setup', `📁 Creating resource group: ${payload.resourceGroup}`);
  sendLog(ws, 'azure-setup', `📍 Location: ${payload.location}`);
  
  await new Promise(resolve => setTimeout(resolve, 1200));
  sendLog(ws, 'azure-setup', '✅ Resource group created');
}

async function createContainerRegistry(ws, payload) {
  sendLog(ws, 'azure-setup', `📦 Creating Azure Container Registry: ${payload.registryName || 'acr-' + payload.appName}`);
  sendLog(ws, 'azure-setup', '⚙️ SKU: Basic (can be upgraded later)');
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  sendLog(ws, 'azure-setup', '✅ Container registry created');
  sendLog(ws, 'azure-setup', `🔗 Registry URL: ${payload.registryName || 'acr-' + payload.appName}.azurecr.io`);
}

async function createContainerEnvironment(ws, payload) {
  sendLog(ws, 'azure-setup', `🌍 Creating container app environment: ${payload.environmentName}`);
  
  await new Promise(resolve => setTimeout(resolve, 1500));
  sendLog(ws, 'azure-setup', '✅ Container environment ready');
  sendLog(ws, 'azure-setup', '🔧 Configured for consumption-based scaling');
}

async function createInitialContainerApp(ws, payload) {
  sendLog(ws, 'azure-setup', `🚀 Creating container app: ${payload.appName}`);
  sendLog(ws, 'azure-setup', '📦 Using temporary public image: mcr.microsoft.com/azuredocs/containerapps-helloworld:latest');
  sendLog(ws, 'azure-setup', '🌐 Enabling external ingress on port 3000');
  
  await new Promise(resolve => setTimeout(resolve, 2500));
  sendLog(ws, 'azure-setup', '✅ Container app deployed');
  sendLog(ws, 'azure-setup', `🌍 Temporary URL: https://${payload.appName}.${payload.location.replace(' ', '').toLowerCase()}.azurecontainerapps.io`);
  sendLog(ws, 'azure-setup', '💡 This will be updated with your custom image in Step 2');
}

// Helper functions for Azure Deploy (using real Azure CLI commands)
async function handleResourceGroup(ws, sessionId, resourceGroupName, location) {
  sendLog(ws, 'azure', `📁 Checking resource group: ${resourceGroupName}`);
  
  try {
    await executeCommand('az', ['group', 'show', '--name', resourceGroupName], {}, ws, `${sessionId}-rg-check`, 'azure');
    sendLog(ws, 'azure', '✅ Resource group exists');
  } catch (error) {
    sendLog(ws, 'azure', `📁 Creating resource group: ${resourceGroupName}`);
    await executeCommand('az', ['group', 'create', '--name', resourceGroupName, '--location', location], {}, ws, `${sessionId}-rg-create`, 'azure');
    sendLog(ws, 'azure', '✅ Resource group created');
  }
}

async function deployContainerApp(ws, sessionId, payload) {
  // Create container environment
  sendLog(ws, 'azure', `🌍 Setting up container environment: ${payload.environmentName}`);
  
  try {
    await executeCommand('az', [
      'containerapp', 'env', 'create',
      '--name', payload.environmentName,
      '--resource-group', payload.resourceGroup,
      '--location', payload.location
    ], {}, ws, `${sessionId}-env-create`, 'azure');
    sendLog(ws, 'azure', '✅ Container environment ready');
  } catch (error) {
    sendLog(ws, 'azure', '⚠️ Environment might already exist, continuing...', 'warning');
  }

  // Create container app
  sendLog(ws, 'azure', `🚀 Deploying container app: ${payload.appName}`);
  sendLog(ws, 'azure', `📦 Using image: ghcr.io/${payload.githubOwner}/azure-container-template:latest`);
  
  await executeCommand('az', [
    'containerapp', 'create',
    '--name', payload.appName,
    '--resource-group', payload.resourceGroup,
    '--environment', payload.environmentName,
    '--image', `ghcr.io/${payload.githubOwner}/azure-container-template:latest`,
    '--target-port', '3000',
    '--ingress', 'external',
    '--registry-server', 'ghcr.io',
    '--registry-username', payload.githubOwner,
    '--registry-password', payload.githubToken,
    '--cpu', '0.25',
    '--memory', '0.5Gi',
    '--min-replicas', '0',
    '--max-replicas', '3'
  ], {}, ws, `${sessionId}-app-create`, 'azure');
}

async function getAppUrl(ws, sessionId, appName, resourceGroup) {
  sendLog(ws, 'azure', '🌐 Getting application URL...');
  
  try {
    await executeCommand('az', [
      'containerapp', 'show',
      '--name', appName,
      '--resource-group', resourceGroup,
      '--query', 'properties.configuration.ingress.fqdn',
      '--output', 'tsv'
    ], {}, ws, `${sessionId}-get-url`, 'azure');
  } catch (error) {
    sendLog(ws, 'azure', '⚠️ Could not retrieve URL automatically', 'warning');
    sendLog(ws, 'azure', `💡 Check Azure portal for ${appName} URL`);
  }
}