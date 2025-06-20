import { sendLog, sendStatus } from '../utils/wsUtils.js';

class RestAPIAzureService {
  constructor() {
    this.credential = null;
    this.subscriptionId = null;
    this.accessToken = null;
    this.useRestAPI = false;
  }

  async authenticateWithBrowser(ws) {
    sendLog(ws, 'azure-setup', '🔑 Starting Microsoft Azure authentication...');
    sendLog(ws, 'azure-setup', '⏳ Opening browser for Azure login...');
    
    try {
      const { InteractiveBrowserCredential } = await import('@azure/identity');
      
      sendLog(ws, 'azure-setup', '🌐 Browser window should open shortly...');
      sendLog(ws, 'azure-setup', '📱 If no browser opens, check popup blockers or try a different browser');
      
      this.credential = new InteractiveBrowserCredential({
        clientId: "04b07795-8ddb-461a-bbee-02f9e1bf7b46",
        tenantId: "common",
        redirectUri: "http://localhost:3000",
        additionallyAllowedTenants: ["*"]
      });
      
      sendLog(ws, 'azure-setup', '🔐 Getting authentication token...');
      
      // Get access token for Azure Management API
      const tokenResponse = await this.credential.getToken([
        "https://management.azure.com/.default"
      ]);
      
      if (tokenResponse && tokenResponse.token) {
        this.accessToken = tokenResponse.token;
        sendLog(ws, 'azure-setup', '✅ Successfully authenticated with Microsoft Azure');
        sendLog(ws, 'azure-setup', '🎫 Authentication token received');
        return true;
      } else {
        throw new Error('No access token received');
      }
      
    } catch (error) {
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  async getSubscriptionViaRestAPI(ws, preferredSubscriptionId = null) {
    sendLog(ws, 'azure-setup', '🔍 Finding Azure subscription via REST API...');
    
    try {
      if (preferredSubscriptionId) {
        // Test the preferred subscription
        sendLog(ws, 'azure-setup', `🧪 Testing subscription: ${preferredSubscriptionId}`);
        
        const response = await fetch(
          `https://management.azure.com/subscriptions/${preferredSubscriptionId}?api-version=2020-01-01`,
          {
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.ok) {
          const subscription = await response.json();
          this.subscriptionId = preferredSubscriptionId;
          sendLog(ws, 'azure-setup', `✅ Using provided subscription: ${subscription.displayName || preferredSubscriptionId}`);
          return preferredSubscriptionId;
        } else {
          sendLog(ws, 'azure-setup', `⚠️ Provided subscription not accessible: ${response.status}`, 'warning');
          sendLog(ws, 'azure-setup', '🔍 Searching for available subscriptions...');
        }
      }
      
      // Get list of available subscriptions
      sendLog(ws, 'azure-setup', '📋 Retrieving available subscriptions...');
      
      const response = await fetch(
        'https://management.azure.com/subscriptions?api-version=2020-01-01',
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get subscriptions: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.value && data.value.length > 0) {
        const subscription = data.value[0];
        this.subscriptionId = subscription.subscriptionId;
        const subscriptionName = subscription.displayName || 'Unknown';
        sendLog(ws, 'azure-setup', `✅ Using subscription: ${subscriptionName} (${this.subscriptionId})`);
        return this.subscriptionId;
      } else {
        throw new Error('No Azure subscriptions found for this account');
      }
      
    } catch (error) {
      throw new Error(`Failed to get subscription via REST API: ${error.message}`);
    }
  }

  async createResourceGroupViaRestAPI(ws, resourceGroupName, location) {
    sendLog(ws, 'azure-setup', `📁 Creating resource group: ${resourceGroupName}`);
    sendLog(ws, 'azure-setup', `📍 Location: ${location}`);
    
    try {
      const response = await fetch(
        `https://management.azure.com/subscriptions/${this.subscriptionId}/resourcegroups/${resourceGroupName}?api-version=2021-04-01`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            location: location,
            tags: {
              createdBy: 'azure-container-template',
              environment: 'development',
              createdAt: new Date().toISOString()
            }
          })
        }
      );

      if (response.ok) {
        sendLog(ws, 'azure-setup', '✅ Resource group created successfully');
      } else if (response.status === 409) {
        sendLog(ws, 'azure-setup', '✅ Resource group already exists');
      } else {
        const errorText = await response.text();
        throw new Error(`Failed to create resource group: ${response.status} - ${errorText}`);
      }
      
    } catch (error) {
      throw new Error(`Resource group creation failed: ${error.message}`);
    }
  }

  async createContainerEnvironmentViaRestAPI(ws, resourceGroupName, environmentName, location) {
    sendLog(ws, 'azure-setup', `🌍 Creating container app environment: ${environmentName}`);
    sendLog(ws, 'azure-setup', '⏳ This may take a few minutes...');
    
    try {
      const response = await fetch(
        `https://management.azure.com/subscriptions/${this.subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.App/managedEnvironments/${environmentName}?api-version=2023-05-01`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            location: location,
            properties: {
              zoneRedundant: false,
              workloadProfiles: [{
                name: "Consumption",
                workloadProfileType: "Consumption"
              }]
            },
            tags: {
              createdBy: 'azure-container-template'
            }
          })
        }
      );

      if (response.ok) {
        sendLog(ws, 'azure-setup', '✅ Container environment created successfully');
        
        // Wait a bit for the environment to be ready
        sendLog(ws, 'azure-setup', '⏳ Waiting for environment to be ready...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
      } else if (response.status === 409) {
        sendLog(ws, 'azure-setup', '✅ Container environment already exists');
      } else {
        const errorText = await response.text();
        throw new Error(`Failed to create container environment: ${response.status} - ${errorText}`);
      }
      
    } catch (error) {
      throw new Error(`Container environment creation failed: ${error.message}`);
    }
  }

  async createContainerAppViaRestAPI(ws, resourceGroupName, appName, environmentName, location) {
    sendLog(ws, 'azure-setup', `🚀 Creating container app: ${appName}`);
    sendLog(ws, 'azure-setup', '📦 Using temporary image for initial setup...');
    
    try {
      // Get the environment resource ID
      const envResponse = await fetch(
        `https://management.azure.com/subscriptions/${this.subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.App/managedEnvironments/${environmentName}?api-version=2023-05-01`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!envResponse.ok) {
        throw new Error(`Container environment not found: ${envResponse.status}`);
      }

      const environment = await envResponse.json();
      const environmentId = environment.id;

      // Create the container app
      const response = await fetch(
        `https://management.azure.com/subscriptions/${this.subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.App/containerApps/${appName}?api-version=2023-05-01`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            location: location,
            properties: {
              managedEnvironmentId: environmentId,
              configuration: {
                ingress: {
                  external: true,
                  targetPort: 80,
                  allowInsecure: false,
                  traffic: [{
                    weight: 100,
                    latestRevision: true
                  }]
                }
              },
              template: {
                containers: [{
                  name: appName,
                  image: 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest',
                  resources: {
                    cpu: 0.25,
                    memory: '0.5Gi'
                  }
                }],
                scale: {
                  minReplicas: 0,
                  maxReplicas: 3
                }
              }
            },
            tags: {
              createdBy: 'azure-container-template'
            }
          })
        }
      );

      if (response.ok) {
        const containerApp = await response.json();
        sendLog(ws, 'azure-setup', '✅ Container app created successfully');
        
        // Get the app URL
        if (containerApp.properties?.configuration?.ingress?.fqdn) {
          const url = `https://${containerApp.properties.configuration.ingress.fqdn}`;
          sendLog(ws, 'azure-setup', `🌍 Application URL: ${url}`);
          sendLog(ws, 'azure-setup', '💡 This shows a demo page - will be updated with your app when deployed');
        }
        
      } else if (response.status === 409) {
        sendLog(ws, 'azure-setup', '✅ Container app already exists');
        
        // Try to get the existing app URL
        try {
          const existingResponse = await fetch(
            `https://management.azure.com/subscriptions/${this.subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.App/containerApps/${appName}?api-version=2023-05-01`,
            {
              headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          if (existingResponse.ok) {
            const existingApp = await existingResponse.json();
            if (existingApp.properties?.configuration?.ingress?.fqdn) {
              const url = `https://${existingApp.properties.configuration.ingress.fqdn}`;
              sendLog(ws, 'azure-setup', `🌍 Application URL: ${url}`);
            }
          }
        } catch (getError) {
          sendLog(ws, 'azure-setup', '⚠️ Could not get existing app details', 'warning');
        }
        
      } else {
        const errorText = await response.text();
        throw new Error(`Failed to create container app: ${response.status} - ${errorText}`);
      }
      
    } catch (error) {
      throw new Error(`Container app creation failed: ${error.message}`);
    }
  }

  async trySDKFallback(ws, payload) {
    sendLog(ws, 'azure-setup', '🔄 Attempting SDK approach as backup...');
    
    try {
      const { ResourceManagementClient } = await import('@azure/arm-resources');
      const { ContainerAppsAPIClient } = await import('@azure/arm-appcontainers');
      
      const resourceClient = new ResourceManagementClient(this.credential, this.subscriptionId);
      const containerClient = new ContainerAppsAPIClient(this.credential, this.subscriptionId);
      
      // Test the clients
      const rgIterator = resourceClient.resourceGroups.list();
      await rgIterator.next();
      
      sendLog(ws, 'azure-setup', '✅ SDK approach working, using SDK for remaining operations');
      
      // Use SDK for remaining operations
      // ... (implement SDK calls here if needed)
      
      return true;
    } catch (error) {
      sendLog(ws, 'azure-setup', `⚠️ SDK fallback failed: ${error.message}`, 'warning');
      sendLog(ws, 'azure-setup', '✅ Continuing with REST API approach', 'info');
      return false;
    }
  }
}

// Main Azure Setup Handler
export async function handleAzureSetup(ws, payload) {
  const azureService = new RestAPIAzureService();
  
  try {
    sendStatus(ws, 'azure-setup', 'starting');
    sendLog(ws, 'azure-setup', '☁️ Setting up Azure infrastructure...');
    sendLog(ws, 'azure-setup', '🔐 Step 1: Authenticate with Microsoft Azure');

    // Step 1: Authenticate
    await azureService.authenticateWithBrowser(ws);

    // Step 2: Get subscription using REST API
    sendLog(ws, 'azure-setup', '📋 Step 2: Getting Azure subscription');
    await azureService.getSubscriptionViaRestAPI(ws, payload.subscriptionId);

    // Step 3: Create resources using REST API
    sendLog(ws, 'azure-setup', '🏗️ Step 3: Creating Azure resources');
    await azureService.createResourceGroupViaRestAPI(ws, payload.resourceGroup, payload.location);
    await azureService.createContainerEnvironmentViaRestAPI(ws, payload.resourceGroup, payload.environmentName, payload.location);
    await azureService.createContainerAppViaRestAPI(ws, payload.resourceGroup, payload.appName, payload.environmentName, payload.location);

    // Optional: Try SDK fallback for future operations
    await azureService.trySDKFallback(ws, payload);

    sendLog(ws, 'azure-setup', '🎉 Azure infrastructure setup completed!');
    sendLog(ws, 'azure-setup', `🏗️ Resource Group: ${payload.resourceGroup}`);
    sendLog(ws, 'azure-setup', `🌍 Container Environment: ${payload.environmentName}`);
    sendLog(ws, 'azure-setup', `🚀 Container App: ${payload.appName}`);
    sendLog(ws, 'azure-setup', '📋 Ready for Step 3: Download deployment workflow');

    sendStatus(ws, 'azure-setup', 'completed', {
      message: 'Azure infrastructure ready!',
      resourceGroup: payload.resourceGroup,
      environmentName: payload.environmentName,
      appName: payload.appName,
      subscriptionId: azureService.subscriptionId
    });

  } catch (error) {
    sendLog(ws, 'azure-setup', `❌ Error: ${error.message}`, 'error');
    
    // Provide specific troubleshooting
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      sendLog(ws, 'azure-setup', '🔧 Authentication expired or insufficient permissions', 'info');
      sendLog(ws, 'azure-setup', '💡 Try refreshing the page and logging in again', 'info');
    } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
      sendLog(ws, 'azure-setup', '🔧 Access denied - check your Azure permissions', 'info');
      sendLog(ws, 'azure-setup', '💡 Ensure you have Contributor access to the subscription', 'info');
    } else if (error.message.includes('subscription')) {
      sendLog(ws, 'azure-setup', '🔧 Subscription access issue', 'info');
      sendLog(ws, 'azure-setup', '💡 Verify your account has access to Azure subscriptions', 'info');
    }
    
    sendStatus(ws, 'azure-setup', 'failed', { error: error.message });
  }
}

export async function handleAzureDeploy(ws, payload) {
  const azureService = new RestAPIAzureService();
  
  try {
    sendStatus(ws, 'azure-deploy', 'starting');
    sendLog(ws, 'azure-deploy', '☁️ Starting Azure deployment...');

    // Authenticate
    await azureService.authenticateWithBrowser(ws);
    await azureService.getSubscriptionViaRestAPI(ws, payload.subscriptionId);

    // Update container app with new image
    const imageUrl = `ghcr.io/${payload.githubOwner}/${payload.githubRepo}:latest`;
    sendLog(ws, 'azure-deploy', `🚀 Updating container app with image: ${imageUrl}`);
    
    // Get current app
    const getResponse = await fetch(
      `https://management.azure.com/subscriptions/${azureService.subscriptionId}/resourceGroups/${payload.resourceGroup}/providers/Microsoft.App/containerApps/${payload.appName}?api-version=2023-05-01`,
      {
        headers: {
          'Authorization': `Bearer ${azureService.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!getResponse.ok) {
      throw new Error(`Container app not found: ${getResponse.status}`);
    }

    const currentApp = await getResponse.json();
    
    // Update with new image
    const updatedApp = {
      ...currentApp,
      properties: {
        ...currentApp.properties,
        configuration: {
          ...currentApp.properties.configuration,
          ingress: {
            ...currentApp.properties.configuration.ingress,
            targetPort: 3000
          }
        },
        template: {
          ...currentApp.properties.template,
          containers: [{
            ...currentApp.properties.template.containers[0],
            image: imageUrl
          }]
        }
      }
    };

    const updateResponse = await fetch(
      `https://management.azure.com/subscriptions/${azureService.subscriptionId}/resourceGroups/${payload.resourceGroup}/providers/Microsoft.App/containerApps/${payload.appName}?api-version=2023-05-01`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${azureService.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedApp)
      }
    );

    if (updateResponse.ok) {
      sendLog(ws, 'azure-deploy', '✅ Container app updated successfully');
      
      if (currentApp.properties?.configuration?.ingress?.fqdn) {
        const url = `https://${currentApp.properties.configuration.ingress.fqdn}`;
        sendLog(ws, 'azure-deploy', `🌍 Application URL: ${url}`);
      }
      
      sendLog(ws, 'azure-deploy', '🎉 Deployment completed successfully!');
      sendStatus(ws, 'azure-deploy', 'completed', { message: 'Deployment completed!' });
    } else {
      const errorText = await updateResponse.text();
      throw new Error(`Deployment failed: ${updateResponse.status} - ${errorText}`);
    }

  } catch (error) {
    sendLog(ws, 'azure-deploy', `❌ Deployment failed: ${error.message}`, 'error');
    sendStatus(ws, 'azure-deploy', 'failed', { error: error.message });
  }
}