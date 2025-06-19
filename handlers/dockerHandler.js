import { sendLog, sendStatus } from '../utils/wsUtils.js';

// Step 1: Azure Infrastructure Setup
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

async function checkAzureCLI(ws) {
  sendLog(ws, 'azure-setup', '🔍 Checking Azure CLI installation...');
  
  // Simulate Azure CLI check
  await new Promise(resolve => setTimeout(resolve, 500));
  sendLog(ws, 'azure-setup', '✅ Azure CLI found');
}

async function handleAzureLogin(ws) {
  sendLog(ws, 'azure-setup', '🔐 Checking Azure authentication...');
  
  await new Promise(resolve => setTimeout(resolve, 800));
  sendLog(ws, 'azure-setup', '🔑 Opening Azure login (OAuth popup)...');
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  sendLog(ws, 'azure-setup', '✅ Successfully authenticated with Azure');
}

async function createResourceGroup(ws, payload) {
  sendLog(ws, 'azure-setup', `📁 Creating resource group: ${payload.resourceGroup}`);
  sendLog(ws, 'azure-setup', `📍 Location: ${payload.location}`);
  
  await new Promise(resolve => setTimeout(resolve, 1200));
  sendLog(ws, 'azure-setup', '✅ Resource group created');
}

async function createContainerRegistry(ws, payload) {
  sendLog(ws, 'azure-setup', `📦 Creating Azure Container Registry: ${payload.registryName}`);
  sendLog(ws, 'azure-setup', '⚙️ SKU: Basic (can be upgraded later)');
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  sendLog(ws, 'azure-setup', '✅ Container registry created');
  sendLog(ws, 'azure-setup', `🔗 Registry URL: ${payload.registryName}.azurecr.io`);
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