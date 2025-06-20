import { DefaultAzureCredential, InteractiveBrowserCredential } from '@azure/identity';
import { ResourceManagementClient } from '@azure/arm-resources';
import { ContainerRegistryManagementClient } from '@azure/arm-containerregistry';
import { ContainerAppsAPIClient } from '@azure/arm-appcontainers';
import { sendLog, sendStatus } from '../utils/wsUtils.js';

class AzureSDKService {
  constructor() {
    this.credential = null;
    this.subscriptionId = null;
    this.resourceClient = null;
    this.registryClient = null;
    this.containerClient = null;
  }

  async authenticate(ws) {
    sendLog(ws, 'azure-setup', '🔐 Authenticating with Azure...');
    
    try {
      // Try default credential first (works if already logged in via CLI, env vars, etc.)
      this.credential = new DefaultAzureCredential();
      
      // Test the credential by listing subscriptions
      const testClient = new ResourceManagementClient(this.credential, '00000000-0000-0000-0000-000000000000');
      const subscriptions = [];
      
      for await (const subscription of testClient.subscriptions.list()) {
        subscriptions.push(subscription);
        break; // Just get the first one to test auth
      }
      
      if (subscriptions.length > 0) {
        sendLog(ws, 'azure-setup', '✅ Using existing Azure credentials');
        return subscriptions[0].subscriptionId;
      }
    } catch (error) {
      sendLog(ws, 'azure-setup', `🔍 Default auth failed: ${error.message}`);
    }
    
    // Fall back to interactive browser login
    sendLog(ws, 'azure-setup', '🔑 Opening browser for Azure login...');
    sendLog(ws, 'azure-setup', '⏳ Please complete login in the browser window...');
    
    try {
      this.credential = new InteractiveBrowserCredential({
        clientId: "04b07795-8ddb-461a-bbee-02f9e1bf7b46", // Azure CLI client ID
        tenantId: "common",
        redirectUri: "http://localhost:3000"
      });
      
      // Test the new credential
      const testClient = new ResourceManagementClient(this.credential, '00000000-0000-0000-0000-000000000000');
      const subscriptions = [];
      
      for await (const subscription of testClient.subscriptions.list()) {
        subscriptions.push(subscription);
        break; // Just get the first one
      }
      
      if (subscriptions.length > 0) {
        sendLog(ws, 'azure-setup', '✅ Successfully authenticated with Azure');
        return subscriptions[0].subscriptionId;
      } else {
        throw new Error('No subscriptions found for this account');
      }
    } catch (authError) {
      throw new Error(`Authentication failed: ${authError.message}`);
    }
  }

  async initializeClients(subscriptionId) {
    this.subscriptionId = subscriptionId;
    this.resourceClient = new ResourceManagementClient(this.credential, subscriptionId);
    this.registryClient = new ContainerRegistryManagementClient(this.credential, subscriptionId);
    this.containerClient = new ContainerAppsAPIClient(this.credential, subscriptionId);
  }

  async createResourceGroup(ws, resourceGroupName, location) {
    sendLog(ws, 'azure-setup', `📁 Creating resource group: ${resourceGroupName}`);
    sendLog(ws, 'azure-setup', `📍 Location: ${location}`);
    
    try {
      const resourceGroup = {
        location: location,
        tags: {
          createdBy: 'azure-container-template',
          environment: 'development'
        }
      };

      const result = await this.resourceClient.resourceGroups.createOrUpdate(
        resourceGroupName,
        resourceGroup
      );

      sendLog(ws, 'azure-setup', '✅ Resource group created successfully');
      return result;
    } catch (error) {
      if (error.statusCode === 409 || error.code === 'ResourceGroupExists') {
        sendLog(ws, 'azure-setup', '✅ Resource group already exists');
        return await this.resourceClient.resourceGroups.get(resourceGroupName);
      }
      throw error;
    }
  }

  async createContainerRegistry(ws, resourceGroupName, registryName, location) {
    sendLog(ws, 'azure-setup', `📦 Creating Azure Container Registry: ${registryName}`);
    sendLog(ws, 'azure-setup', '⚙️ SKU: Basic (can be upgraded later)');
    
    try {
      const registryParams = {
        location: location,
        sku: {
          name: 'Basic'
        },
        adminUserEnabled: true,
        tags: {
          createdBy: 'azure-container-template'
        }
      };

      const operation = await this.registryClient.registries.beginCreateAndWait(
        resourceGroupName,
        registryName,
        registryParams
      );

      sendLog(ws, 'azure-setup', '✅ Container registry created successfully');
      sendLog(ws, 'azure-setup', `🔗 Registry URL: ${registryName}.azurecr.io`);
      
      return operation;
    } catch (error) {
      if (error.statusCode === 409 || error.code === 'RegistryNameNotAvailable') {
        sendLog(ws, 'azure-setup', '✅ Container registry already exists');
        try {
          return await this.registryClient.registries.get(resourceGroupName, registryName);
        } catch (getError) {
          sendLog(ws, 'azure-setup', '⚠️ Registry name may be taken by another subscription', 'warning');
          throw new Error(`Registry name "${registryName}" is not available. Try a different name.`);
        }
      }
      throw error;
    }
  }

  async createContainerEnvironment(ws, resourceGroupName, environmentName, location) {
    sendLog(ws, 'azure-setup', `🌍 Creating container app environment: ${environmentName}`);
    
    try {
      const environmentParams = {
        location: location,
        properties: {
          zoneRedundant: false
        },
        tags: {
          createdBy: 'azure-container-template'
        }
      };

      const operation = await this.containerClient.managedEnvironments.beginCreateOrUpdateAndWait(
        resourceGroupName,
        environmentName,
        environmentParams
      );

      sendLog(ws, 'azure-setup', '✅ Container environment created successfully');
      sendLog(ws, 'azure-setup', '🔧 Configured for consumption-based scaling');
      
      return operation;
    } catch (error) {
      if (error.statusCode === 409) {
        sendLog(ws, 'azure-setup', '✅ Container environment already exists');
        return await this.containerClient.managedEnvironments.get(resourceGroupName, environmentName);
      }
      throw error;
    }
  }

  async createContainerApp(ws, resourceGroupName, appName, environmentName, location) {
    sendLog(ws, 'azure-setup', `🚀 Creating container app: ${appName}`);
    sendLog(ws, 'azure-setup', '📦 Using temporary public image: mcr.microsoft.com/azuredocs/containerapps-helloworld:latest');
    
    try {
      // Get environment resource ID
      const environment = await this.containerClient.managedEnvironments.get(
        resourceGroupName, 
        environmentName
      );

      const containerAppParams = {
        location: location,
        properties: {
          managedEnvironmentId: environment.id,
          configuration: {
            ingress: {
              external: true,
              targetPort: 80,
              allowInsecure: false,
              traffic: [
                {
                  weight: 100,
                  latestRevision: true
                }
              ]
            }
          },
          template: {
            containers: [
              {
                name: appName,
                image: 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest',
                resources: {
                  cpu: 0.25,
                  memory: '0.5Gi'
                }
              }
            ],
            scale: {
              minReplicas: 0,
              maxReplicas: 3
            }
          }
        },
        tags: {
          createdBy: 'azure-container-template'
        }
      };

      const operation = await this.containerClient.containerApps.beginCreateOrUpdateAndWait(
        resourceGroupName,
        appName,
        containerAppParams
      );

      sendLog(ws, 'azure-setup', '✅ Container app created successfully');
      
      // Get the app URL
      if (operation.properties?.configuration?.ingress?.fqdn) {
        const url = `https://${operation.properties.configuration.ingress.fqdn}`;
        sendLog(ws, 'azure-setup', `🌍 Application URL: ${url}`);
      }
      
      sendLog(ws, 'azure-setup', '💡 This will be updated with your custom image when you deploy');
      
      return operation;
    } catch (error) {
      if (error.statusCode === 409) {
        sendLog(ws, 'azure-setup', '✅ Container app already exists');
        const app = await this.containerClient.containerApps.get(resourceGroupName, appName);
        
        if (app.properties?.configuration?.ingress?.fqdn) {
          const url = `https://${app.properties.configuration.ingress.fqdn}`;
          sendLog(ws, 'azure-setup', `🌍 Application URL: ${url}`);
        }
        
        return app;
      }
      throw error;
    }
  }

  async updateContainerApp(ws, resourceGroupName, appName, imageUrl) {
    sendLog(ws, 'azure-deploy', `🚀 Updating container app: ${appName}`);
    sendLog(ws, 'azure-deploy', `📦 Using image: ${imageUrl}`);
    
    try {
      // Get current app configuration
      const currentApp = await this.containerClient.containerApps.get(resourceGroupName, appName);
      
      // Update the container image and target port for custom image
      const updatedApp = {
        location: currentApp.location,
        properties: {
          ...currentApp.properties,
          configuration: {
            ...currentApp.properties.configuration,
            ingress: {
              ...currentApp.properties.configuration.ingress,
              targetPort: 3000 // Update port for our custom app
            }
          },
          template: {
            ...currentApp.properties.template,
            containers: [
              {
                ...currentApp.properties.template.containers[0],
                image: imageUrl
              }
            ]
          }
        }
      };

      const operation = await this.containerClient.containerApps.beginCreateOrUpdateAndWait(
        resourceGroupName,
        appName,
        updatedApp
      );

      sendLog(ws, 'azure-deploy', '✅ Container app updated successfully');
      
      if (operation.properties?.configuration?.ingress?.fqdn) {
        const url = `https://${operation.properties.configuration.ingress.fqdn}`;
        sendLog(ws, 'azure-deploy', `🌍 Application URL: ${url}`);
      }
      
      return operation;
    } catch (error) {
      throw new Error(`Failed to update container app: ${error.message}`);
    }
  }
}

// Step 1: Azure Infrastructure Setup using Azure SDK
export async function handleAzureSetup(ws, payload) {
  const azureService = new AzureSDKService();
  
  try {
    sendStatus(ws, 'azure-setup', 'starting');
    sendLog(ws, 'azure-setup', '☁️ Setting up Azure infrastructure...');

    // Step 1: Authenticate
    let subscriptionId = payload.subscriptionId;
    
    if (!subscriptionId) {
      sendLog(ws, 'azure-setup', '⚠️ No subscription ID provided, trying to detect...', 'warning');
      subscriptionId = await azureService.authenticate(ws);
    } else {
      // Use provided subscription ID but still need to authenticate
      sendLog(ws, 'azure-setup', '🔐 Authenticating with Azure...');
      try {
        azureService.credential = new DefaultAzureCredential();
        sendLog(ws, 'azure-setup', '✅ Using existing Azure credentials');
      } catch (error) {
        sendLog(ws, 'azure-setup', '🔑 Opening browser for Azure login...');
        azureService.credential = new InteractiveBrowserCredential({
          clientId: "04b07795-8ddb-461a-bbee-02f9e1bf7b46",
          tenantId: "common",
          redirectUri: "http://localhost:3000"
        });
        sendLog(ws, 'azure-setup', '✅ Successfully authenticated with Azure');
      }
    }
    
    if (!subscriptionId) {
      throw new Error('Azure subscription ID is required. Please provide it in the form or ensure you have access to Azure subscriptions.');
    }
    
    sendLog(ws, 'azure-setup', `🔧 Using subscription: ${subscriptionId}`);
    
    // Step 2: Initialize clients
    await azureService.initializeClients(subscriptionId);
    
    // Step 3: Create resource group
    await azureService.createResourceGroup(ws, payload.resourceGroup, payload.location);
    
    // Step 4: Create container registry (optional)
    if (payload.createRegistry !== false) {
      const registryName = payload.registryName || `acr${payload.appName.replace(/[^a-zA-Z0-9]/g, '')}`;
      await azureService.createContainerRegistry(ws, payload.resourceGroup, registryName, payload.location);
    }
    
    // Step 5: Create container environment
    await azureService.createContainerEnvironment(ws, payload.resourceGroup, payload.environmentName, payload.location);
    
    // Step 6: Create container app
    await azureService.createContainerApp(ws, payload.resourceGroup, payload.appName, payload.environmentName, payload.location);

    sendLog(ws, 'azure-setup', '🎉 Azure infrastructure setup completed!');
    sendLog(ws, 'azure-setup', `🏗️ Resource Group: ${payload.resourceGroup}`);
    
    if (payload.createRegistry !== false) {
      const registryName = payload.registryName || `acr${payload.appName.replace(/[^a-zA-Z0-9]/g, '')}`;
      sendLog(ws, 'azure-setup', `📦 Container Registry: ${registryName}.azurecr.io`);
    }
    
    sendLog(ws, 'azure-setup', `🌍 Container Environment: ${payload.environmentName}`);
    sendLog(ws, 'azure-setup', `🚀 Container App: ${payload.appName}`);

    sendStatus(ws, 'azure-setup', 'completed', {
      message: 'Azure infrastructure ready!',
      resourceGroup: payload.resourceGroup,
      registryName: payload.registryName || `acr${payload.appName.replace(/[^a-zA-Z0-9]/g, '')}`,
      environmentName: payload.environmentName,
      appName: payload.appName,
      subscriptionId: subscriptionId
    });

  } catch (error) {
    sendLog(ws, 'azure-setup', `❌ Error: ${error.message}`, 'error');
    sendStatus(ws, 'azure-setup', 'failed', { error: error.message });
  }
}

// Step 2: Azure Deployment using Azure SDK
export async function handleAzureDeploy(ws, payload) {
  const azureService = new AzureSDKService();
  
  try {
    sendStatus(ws, 'azure-deploy', 'starting');
    sendLog(ws, 'azure-deploy', '☁️ Starting Azure deployment...');

    // Authenticate and initialize
    const subscriptionId = payload.subscriptionId || await azureService.authenticate(ws);
    await azureService.initializeClients(subscriptionId);
    
    // Ensure resource group exists
    await azureService.createResourceGroup(ws, payload.resourceGroup, payload.location);
    
    // Deploy the custom container image
    const imageUrl = `ghcr.io/${payload.githubOwner}/${payload.githubRepo}:latest`;
    await azureService.updateContainerApp(ws, payload.resourceGroup, payload.appName, imageUrl);

    sendLog(ws, 'azure-deploy', '🎉 Deployment completed successfully!');
    sendStatus(ws, 'azure-deploy', 'completed', {
      message: 'Azure deployment completed successfully!'
    });

  } catch (error) {
    sendLog(ws, 'azure-deploy', `❌ Deployment failed: ${error.message}`, 'error');
    sendStatus(ws, 'azure-deploy', 'failed', { error: error.message });
  }
}