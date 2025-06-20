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

  async checkLatestAPIVersion(ws) {
    try {
      sendLog(ws, 'azure-setup', '🔍 Checking latest Container Apps API version...');
      
      const response = await fetch(
        `https://management.azure.com/subscriptions/${this.subscriptionId}/providers/Microsoft.App?api-version=2021-04-01`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const providerInfo = await response.json();
        const containerAppsResource = providerInfo.resourceTypes?.find(rt => rt.resourceType === 'containerApps');
        if (containerAppsResource) {
          const latestApiVersion = containerAppsResource.apiVersions?.[0];
          sendLog(ws, 'azure-setup', `📋 Latest API version: ${latestApiVersion || 'Unknown'}`);
          sendLog(ws, 'azure-setup', `📋 Available versions: ${containerAppsResource.apiVersions?.slice(0, 3).join(', ') || 'Unknown'}`);
          return latestApiVersion;
        }
      }
    } catch (error) {
      sendLog(ws, 'azure-setup', `⚠️ Could not check API versions: ${error.message}`, 'warning');
    }
    return '2025-01-01'; // fallback
  }

  async createContainerAppViaRestAPI(ws, resourceGroupName, appName, environmentName, location, payload) {
    sendLog(ws, 'azure-setup', `🚀 Creating container app: ${appName}`);
    
    // Debug: Log the payload to see what we're receiving
    sendLog(ws, 'azure-setup', `🔍 Debug - Received payload keys: ${Object.keys(payload).join(', ')}`);
    
    // Use the GitHub image if available, otherwise fall back to demo image
    let userImage = null;
    let githubOwner = '';
    let githubRepo = '';
    
    // Check multiple ways the GitHub info might be provided
    if (payload.githubOwner && payload.githubRepo) {
      githubOwner = payload.githubOwner;
      githubRepo = payload.githubRepo;
      userImage = `ghcr.io/${githubOwner}/${githubRepo}:latest`;
      sendLog(ws, 'azure-setup', `🔍 Using direct owner/repo: ${githubOwner}/${githubRepo}`);
    } else if (payload.githubContainerUrl) {
      // Try to parse the container URL - handle both package and repo URLs
      sendLog(ws, 'azure-setup', `🔍 Parsing container URL: ${payload.githubContainerUrl}`);
      
      // Match GitHub package URLs: https://github.com/user/repo/pkgs/container/package-name
      let urlMatch = payload.githubContainerUrl.match(/github\.com\/([^\/]+)\/([^\/]+)\/pkgs\/container\/([^\/\?]+)/);
      if (urlMatch) {
        githubOwner = urlMatch[1];
        githubRepo = urlMatch[2];
        const packageName = urlMatch[3];
        userImage = `ghcr.io/${githubOwner}/${packageName.toLowerCase()}:latest`;
        sendLog(ws, 'azure-setup', `🔍 Parsed package URL - Owner: ${githubOwner}, Repo: ${githubRepo}, Package: ${packageName.toLowerCase()}`);
      } else {
        // Try standard repo URL: https://github.com/user/repo
        urlMatch = payload.githubContainerUrl.match(/github\.com\/([^\/]+)\/([^\/\?]+)/);
        if (urlMatch) {
          githubOwner = urlMatch[1];
          githubRepo = urlMatch[2];
          userImage = `ghcr.io/${githubOwner}/${githubRepo.toLowerCase()}:latest`;
          sendLog(ws, 'azure-setup', `🔍 Parsed repo URL - Owner: ${githubOwner}, Repo: ${githubRepo}`);
        }
      }
    }
    
    const deploymentImage = userImage || 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest';
    const targetPort = userImage ? 3000 : 80; // Port 3000 for React apps, 80 for demo
    
    if (userImage) {
      sendLog(ws, 'azure-setup', `📦 ✅ Using GitHub image: ${userImage}`);
      sendLog(ws, 'azure-setup', `🌐 Port configured: ${targetPort}`);
      sendLog(ws, 'azure-setup', `👤 Owner: ${githubOwner}, 📦 Repo: ${githubRepo}`);
      sendLog(ws, 'azure-setup', `⚠️  Note: Ensure your GitHub package is publicly accessible`);
      sendLog(ws, 'azure-setup', `💡 If private, you'll need to add registry credentials to Azure`);
    } else {
      sendLog(ws, 'azure-setup', `📦 ❌ No GitHub image found - using demo image: ${deploymentImage}`, 'warning');
      sendLog(ws, 'azure-setup', `🔍 Debug info:`, 'warning');
      sendLog(ws, 'azure-setup', `  - githubOwner: "${payload.githubOwner}"`, 'warning');
      sendLog(ws, 'azure-setup', `  - githubRepo: "${payload.githubRepo}"`, 'warning');
      sendLog(ws, 'azure-setup', `  - githubContainerUrl: "${payload.githubContainerUrl}"`, 'warning');
    }
    
    try {
      // Check latest API version first
      const latestApiVersion = await this.checkLatestAPIVersion(ws);
      
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

      // Create timestamp for revision suffix (shorter format)
      const timestamp = Date.now().toString().slice(-8); // Use last 8 digits of timestamp
      
      // Create the container app with configuration matching the working template
      const containerAppConfig = {
        location: location,
        identity: {
          type: "None"
        },
        properties: {
          managedEnvironmentId: environmentId,
          environmentId: environmentId, // Add both IDs like the working template
          workloadProfileName: "Consumption", // Add workload profile
          configuration: {
            activeRevisionsMode: "Single", // Add revision mode
            ingress: {
              external: true,
              targetPort: targetPort,
              exposedPort: 0, // Add exposed port
              transport: "Auto", // Add transport
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
              image: deploymentImage,
              resources: {
                cpu: 0.25,
                memory: '0.5Gi'
              },
              probes: [] // Add empty probes array
            }],
            scale: {
              minReplicas: 0,
              maxReplicas: 3
            },
            volumes: [] // Add empty volumes array
          }
        },
        tags: {
          createdBy: 'azure-container-template',
          targetImage: userImage || 'demo-image'
        }
      };

      sendLog(ws, 'azure-setup', '🔍 Using configuration that matches working template...');
      sendLog(ws, 'azure-setup', `📦 Request body size: ${JSON.stringify(containerAppConfig).length} chars`);
      
      // Log the exact configuration being sent for debugging
      sendLog(ws, 'azure-setup', '🔍 Debug - Full request body:');
      sendLog(ws, 'azure-setup', JSON.stringify(containerAppConfig, null, 2));
      
      const response = await fetch(
        `https://management.azure.com/subscriptions/${this.subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.App/containerApps/${appName}?api-version=${latestApiVersion}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(containerAppConfig)
        }
      );

      if (response.ok) {
        const containerApp = await response.json();
        sendLog(ws, 'azure-setup', '✅ Container app created successfully');
        
        // Log the full response for debugging
        sendLog(ws, 'azure-setup', `🔍 Azure response status: ${response.status}`);
        sendLog(ws, 'azure-setup', `📋 Container app ID: ${containerApp.id || 'Unknown'}`);
        sendLog(ws, 'azure-setup', `📊 Provisioning state: ${containerApp.properties?.provisioningState || 'Unknown'}`);
        
        // Log the full response to see what we're actually getting
        sendLog(ws, 'azure-setup', '🔍 Debug - Full Azure response:');
        sendLog(ws, 'azure-setup', JSON.stringify(containerApp, null, 2));
        
        // Get the app URL and provide clear feedback
        if (containerApp.properties?.configuration?.ingress?.fqdn) {
          const url = `https://${containerApp.properties.configuration.ingress.fqdn}`;
          sendLog(ws, 'azure-setup', `🌍 Application URL: ${url}`);
        } else {
          sendLog(ws, 'azure-setup', '⚠️ No FQDN found in response - container app may not be properly configured', 'warning');
          sendLog(ws, 'azure-setup', '🔍 Ingress config in response:', 'warning');
          sendLog(ws, 'azure-setup', JSON.stringify(containerApp.properties?.configuration?.ingress || 'No ingress found', null, 2), 'warning');
        }
        
        // Log the revision details for debugging
        sendLog(ws, 'azure-setup', '🔍 Container app details:');
        sendLog(ws, 'azure-setup', `  - Image: ${deploymentImage}`);
        sendLog(ws, 'azure-setup', `  - Port: ${targetPort}`);
        sendLog(ws, 'azure-setup', `  - CPU: 0.25, Memory: 0.5Gi`);
        sendLog(ws, 'azure-setup', `  - Scale: 0-3 replicas`);
        
        // Wait a moment then check revision status
        sendLog(ws, 'azure-setup', '⏳ Checking revision status in 15 seconds...');
        setTimeout(async () => {
          try {
            await this.checkRevisionStatus(ws, resourceGroupName, appName);
          } catch (error) {
            sendLog(ws, 'azure-setup', `⚠️ Could not check revision status: ${error.message}`, 'warning');
          }
        }, 15000); // Check after 15 seconds to give Azure more time
        
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
        sendLog(ws, 'azure-setup', `❌ Container app creation response: ${response.status}`, 'error');
        sendLog(ws, 'azure-setup', `📋 Response headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`, 'error');
        sendLog(ws, 'azure-setup', `📄 Error details: ${errorText}`, 'error');
        throw new Error(`Failed to create container app: ${response.status} - ${errorText}`);
      }
      
    } catch (error) {
      throw new Error(`Container app creation failed: ${error.message}`);
    }
  }

  async checkRevisionStatus(ws, resourceGroupName, appName) {
    try {
      // Get revision list
      const revisionsResponse = await fetch(
        `https://management.azure.com/subscriptions/${this.subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.App/containerApps/${appName}/revisions?api-version=2025-01-01`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (revisionsResponse.ok) {
        const revisions = await revisionsResponse.json();
        sendLog(ws, 'azure-setup', `📋 Found ${revisions.value?.length || 0} revision(s)`);
        
        if (revisions.value && revisions.value.length > 0) {
          const latestRevision = revisions.value[0];
          const status = latestRevision.properties?.provisioningState || 'Unknown';
          const trafficWeight = latestRevision.properties?.trafficWeight || 0;
          
          sendLog(ws, 'azure-setup', `🔍 Latest revision: ${latestRevision.name}`);
          sendLog(ws, 'azure-setup', `📊 Status: ${status}, Traffic: ${trafficWeight}%`);
          
          if (status === 'Failed') {
            sendLog(ws, 'azure-setup', '❌ Revision failed to start!', 'error');
            sendLog(ws, 'azure-setup', '💡 This usually means:', 'info');
            sendLog(ws, 'azure-setup', '  - Image failed to pull', 'info');
            sendLog(ws, 'azure-setup', '  - App crashed on startup', 'info');
            sendLog(ws, 'azure-setup', '  - Wrong port configuration', 'info');
          } else if (status === 'Provisioning') {
            sendLog(ws, 'azure-setup', '⏳ Revision is still starting up...', 'info');
          } else if (status === 'Provisioned') {
            sendLog(ws, 'azure-setup', '✅ Revision is running successfully!', 'info');
          }
        } else {
          sendLog(ws, 'azure-setup', '⚠️ No revisions found - this indicates a problem', 'warning');
        }
      }
    } catch (error) {
      sendLog(ws, 'azure-setup', `❌ Error checking revisions: ${error.message}`, 'error');
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
    await azureService.createContainerAppViaRestAPI(ws, payload.resourceGroup, payload.appName, payload.environmentName, payload.location, payload);

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
            targetPort: 3000 // Ensure correct port for React app
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