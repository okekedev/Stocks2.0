import { executeCommand } from '../utils/commandUtils.js';
import { sendLog, sendStatus } from '../utils/wsUtils.js';
import fs from 'fs';
import path from 'path';

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

async function checkAzureCLI(ws, sessionId) {
  sendLog(ws, 'azure', '🔍 Checking Azure CLI installation...');
  
  try {
    await executeCommand('az', ['--version'], {}, ws, `${sessionId}-version`, 'azure');
    sendLog(ws, 'azure', '✅ Azure CLI found');
  } catch (error) {
    sendLog(ws, 'azure', '❌ Azure CLI not installed', 'error');
    sendLog(ws, 'azure', '📥 Install from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli');
    throw error;
  }
}

async function handleAzureLogin(ws, sessionId) {
  sendLog(ws, 'azure', '🔐 Checking Azure authentication...');
  
  try {
    await executeCommand('az', ['account', 'show'], {}, ws, `${sessionId}-account`, 'azure');
    sendLog(ws, 'azure', '✅ Already logged into Azure');
  } catch (error) {
    sendLog(ws, 'azure', '🔑 Opening Azure login...');
    await executeCommand('az', ['login'], {}, ws, `${sessionId}-login`, 'azure');
    sendLog(ws, 'azure', '✅ Successfully logged into Azure');
  }
}

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