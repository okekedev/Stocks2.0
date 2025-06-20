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

  // NEW: Check if resource group exists
  async checkResourceGroupExists(ws, resourceGroupName) {
    try {
      const response = await fetch(
        `https://management.azure.com/subscriptions/${this.subscriptionId}/resourcegroups/${resourceGroupName}?api-version=2021-04-01`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async createResourceGroupViaRestAPI(ws, resourceGroupName, location) {
    // Check if resource group already exists
    const exists = await this.checkResourceGroupExists(ws, resourceGroupName);
    if (exists) {
      sendLog(ws, 'azure-setup', `✅ Resource group '${resourceGroupName}' already exists - continuing...`);
      return;
    }

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

  // NEW: Check if container environment exists
  async checkContainerEnvironmentExists(ws, resourceGroupName, environmentName) {
    try {
      const response = await fetch(
        `https://management.azure.com/subscriptions/${this.subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.App/managedEnvironments/${environmentName}?api-version=2023-05-01`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async createContainerEnvironmentViaRestAPI(ws, resourceGroupName, environmentName, location) {
    // Check if container environment already exists
    const exists = await this.checkContainerEnvironmentExists(ws, resourceGroupName, environmentName);
    if (exists) {
      sendLog(ws, 'azure-setup', `✅ Container environment '${environmentName}' already exists - continuing...`);
      return;
    }

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
          return latestApiVersion;
        }
      }
    } catch (error) {
      // Silent fallback
    }
    return '2025-01-01'; // fallback
  }

  // Fixed function to parse GitHub container URL correctly
  parseGitHubContainerUrl(url) {
    if (!url) return null;
    
    // Expected format: https://github.com/username/repo/pkgs/container/container-name
    const regex = /https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/pkgs\/container\/([^\/\?]+)/;
    const match = url.match(regex);
    
    if (match) {
      const [, owner, repo, containerName] = match;
      return {
        githubOwner: owner,
        githubRepo: repo,
        containerName: containerName,  // This is the actual container image name
        imageUrl: `ghcr.io/${owner}/${containerName}:latest`
      };
    }
    return null;
  }

  // NEW: Check if container app exists
  async checkContainerAppExists(ws, resourceGroupName, appName) {
    try {
      const response = await fetch(
        `https://management.azure.com/subscriptions/${this.subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.App/containerApps/${appName}?api-version=2023-05-01`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.ok) {
        const existingApp = await response.json();
        if (existingApp.properties?.configuration?.ingress?.fqdn) {
          const url = `https://${existingApp.properties.configuration.ingress.fqdn}`;
          sendLog(ws, 'azure-setup', `🌍 Existing application URL: ${url}`);
        }
        return { exists: true, app: existingApp };
      }
      return { exists: false, app: null };
    } catch (error) {
      return { exists: false, app: null };
    }
  }

  async createContainerAppViaRestAPI(ws, resourceGroupName, appName, environmentName, location, payload) {
    // Check if container app already exists
    const { exists, app: existingApp } = await this.checkContainerAppExists(ws, resourceGroupName, appName);
    if (exists) {
      sendLog(ws, 'azure-setup', `✅ Container app '${appName}' already exists - continuing with workflow...`);
      
      // Still check revision status for existing app
      setTimeout(async () => {
        try {
          await this.checkRevisionStatus(ws, resourceGroupName, appName);
        } catch (error) {
          // Silent fail for existing apps
        }
      }, 3000);
      
      return;
    }

    sendLog(ws, 'azure-setup', `🚀 Creating container app: ${appName}`);
    
    let userImage = null;
    let githubOwner = '';
    let containerName = '';
    
    // Priority 1: Use containerImageName if provided by frontend
    if (payload.githubOwner && payload.containerImageName) {
      githubOwner = payload.githubOwner;
      containerName = payload.containerImageName;
      userImage = `ghcr.io/${githubOwner}/${containerName}:latest`;
      sendLog(ws, 'azure-setup', `✅ Using containerImageName from frontend: ${githubOwner}/${containerName}`);
    }
    // Priority 2: Parse the GitHub container URL
    else if (payload.githubContainerUrl) {
      sendLog(ws, 'azure-setup', `🔍 Parsing container URL: ${payload.githubContainerUrl}`);
      
      const parsed = this.parseGitHubContainerUrl(payload.githubContainerUrl);
      if (parsed) {
        githubOwner = parsed.githubOwner;
        containerName = parsed.containerName;
        userImage = parsed.imageUrl;
        sendLog(ws, 'azure-setup', `✅ Parsed package URL - Owner: ${githubOwner}, Container: ${containerName}`);
        sendLog(ws, 'azure-setup', `✅ Image URL: ${userImage}`);
      } else {
        sendLog(ws, 'azure-setup', `⚠️ Could not parse GitHub container URL`, 'warning');
      }
    }
    // Priority 3: Fall back to direct owner/repo (legacy)
    else if (payload.githubOwner && payload.githubRepo) {
      githubOwner = payload.githubOwner;
      containerName = payload.githubRepo.toLowerCase(); // Convert to lowercase for container registry
      userImage = `ghcr.io/${githubOwner}/${containerName}:latest`;
      sendLog(ws, 'azure-setup', `⚠️ Using legacy owner/repo (converted to lowercase): ${githubOwner}/${containerName}`);
    }
    
    const deploymentImage = userImage || 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest';
    const targetPort = userImage ? 3000 : 80; // Port 3000 for React apps, 80 for demo
    
    if (userImage) {
      sendLog(ws, 'azure-setup', `📦 ✅ Using GitHub image: ${userImage}`);
      sendLog(ws, 'azure-setup', `🌐 Port configured: ${targetPort}`);
      sendLog(ws, 'azure-setup', `👤 Owner: ${githubOwner}, 📦 Container: ${containerName}`);
      sendLog(ws, 'azure-setup', `⚠️  Note: Ensure your GitHub package is publicly accessible`);
      sendLog(ws, 'azure-setup', `💡 If private, you'll need to add registry credentials to Azure`);
    } else {
      sendLog(ws, 'azure-setup', `📦 ❌ No GitHub image found - using demo image: ${deploymentImage}`, 'warning');
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
          targetImage: userImage || 'demo-image',
          parsedContainer: containerName || 'none',
          githubOwner: githubOwner || 'none'
        }
      };

      sendLog(ws, 'azure-setup', `📦 Final image being deployed: ${deploymentImage}`);
      
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
        
        // Get the app URL and provide clear feedback
        if (containerApp.properties?.configuration?.ingress?.fqdn) {
          const url = `https://${containerApp.properties.configuration.ingress.fqdn}`;
          sendLog(ws, 'azure-setup', `🌍 Application URL: ${url}`);
        }
        
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
          
          sendLog(ws, 'azure-setup', `📊 Status: ${status}, Traffic: ${trafficWeight}%`);
          
          if (status === 'Failed') {
            sendLog(ws, 'azure-setup', '❌ Revision failed to start!', 'error');
            sendLog(ws, 'azure-setup', '💡 This usually means:', 'info');
            sendLog(ws, 'azure-setup', '  - Image failed to pull (check if image exists and is public)', 'info');
            sendLog(ws, 'azure-setup', '  - App crashed on startup', 'info');
            sendLog(ws, 'azure-setup', '  - Wrong port configuration', 'info');
          } else if (status === 'Provisioning') {
            sendLog(ws, 'azure-setup', '⏳ Revision is still starting up...', 'info');
          } else if (status === 'Provisioned') {
            sendLog(ws, 'azure-setup', '✅ Revision is running successfully!', 'info');
            sendLog(ws, 'azure-setup', '📋 Ready for Step 3: Download deployment workflow');
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
      
      return true;
    } catch (error) {
      sendLog(ws, 'azure-setup', `⚠️ SDK fallback failed: ${error.message}`, 'warning');
      sendLog(ws, 'azure-setup', '✅ Continuing with REST API approach', 'info');
      return false;
    }
  }

  // CI/CD Methods
  async createManagedIdentity(ws, resourceGroupName, identityName, location) {
    sendLog(ws, 'cicd-setup', `🆔 Creating managed identity: ${identityName}`);
    
    try {
      const response = await fetch(
        `https://management.azure.com/subscriptions/${this.subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.ManagedIdentity/userAssignedIdentities/${identityName}?api-version=2023-01-31`,
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
              purpose: 'github-actions-oidc'
            }
          })
        }
      );

      if (response.ok || response.status === 201) {
        sendLog(ws, 'cicd-setup', '✅ Managed identity created successfully');
      } else if (response.status === 409) {
        sendLog(ws, 'cicd-setup', '✅ Managed identity already exists');
      } else {
        const errorText = await response.text();
        throw new Error(`Failed to create managed identity: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      throw new Error(`Managed identity creation failed: ${error.message}`);
    }
  }

  async getManagedIdentityDetails(ws, resourceGroupName, identityName) {
    sendLog(ws, 'cicd-setup', '🔍 Getting managed identity details...');
    
    try {
      const response = await fetch(
        `https://management.azure.com/subscriptions/${this.subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.ManagedIdentity/userAssignedIdentities/${identityName}?api-version=2023-01-31`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get managed identity: ${response.status}`);
      }

      const identity = await response.json();
      
      // Get tenant ID from the access token (decode JWT)
      const tokenParts = this.accessToken.split('.');
      const payload = JSON.parse(atob(tokenParts[1]));
      const tenantId = payload.tid;

      return {
        clientId: identity.properties.clientId,
        principalId: identity.properties.principalId,
        tenantId: tenantId
      };
    } catch (error) {
      throw new Error(`Failed to get identity details: ${error.message}`);
    }
  }

  // FIXED: Robust role assignment with multiple approaches
  async assignIdentityPermissions(ws, subscriptionId, resourceGroupName, principalId) {
    sendLog(ws, 'cicd-setup', '🔐 Assigning Contributor permissions...');
    
    try {
      // Generate a UUID for the role assignment
      const roleAssignmentId = crypto.randomUUID ? crypto.randomUUID() : 
        'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c == 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });

      // Contributor role definition ID (this is a constant for all Azure subscriptions)
      const contributorRoleId = 'b24988ac-6180-42a0-ab88-20f7382dd24c';
      
      // Validate inputs
      if (!subscriptionId || !resourceGroupName || !principalId) {
        throw new Error(`Missing required parameters: subscriptionId=${subscriptionId}, resourceGroupName=${resourceGroupName}, principalId=${principalId}`);
      }
      
      sendLog(ws, 'cicd-setup', `🔍 Creating role assignment for resource group: ${resourceGroupName}`);
      sendLog(ws, 'cicd-setup', `🔍 Principal ID: ${principalId}`);
      
      // Use subscription-level API endpoint (simpler and more reliable)
      const url = `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.Authorization/roleAssignments/${roleAssignmentId}?api-version=2022-04-01`;
      
      const requestBody = {
        properties: {
          roleDefinitionId: `/subscriptions/${subscriptionId}/providers/Microsoft.Authorization/roleDefinitions/${contributorRoleId}`,
          principalId: principalId,
          principalType: 'ServicePrincipal',
          // Scope to the specific resource group
          scope: `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}`
        }
      };

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok || response.status === 201) {
        sendLog(ws, 'cicd-setup', '✅ Contributor permissions assigned successfully');
        sendLog(ws, 'cicd-setup', `🎯 Scope: Resource Group "${resourceGroupName}"`);
      } else if (response.status === 409) {
        sendLog(ws, 'cicd-setup', '✅ Permissions already exist - continuing...');
      } else {
        const errorText = await response.text();
        sendLog(ws, 'cicd-setup', `❌ Role assignment failed with status: ${response.status}`);
        sendLog(ws, 'cicd-setup', `❌ Error details: ${errorText}`);
        
        // Try the alternative approach using resource group scope in URL
        sendLog(ws, 'cicd-setup', '🔄 Trying alternative approach...');
        return await this.assignIdentityPermissionsAlternative(ws, subscriptionId, resourceGroupName, principalId);
      }
    } catch (error) {
      sendLog(ws, 'cicd-setup', `❌ Permission assignment error: ${error.message}`);
      throw new Error(`Permission assignment failed: ${error.message}`);
    }
  }

  // Fallback method using resource group scope in URL
  async assignIdentityPermissionsAlternative(ws, subscriptionId, resourceGroupName, principalId) {
    try {
      const roleAssignmentId = crypto.randomUUID ? crypto.randomUUID() : 
        'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c == 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });

      const contributorRoleId = 'b24988ac-6180-42a0-ab88-20f7382dd24c';
      
      // Use resource group scoped endpoint
      const url = `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.Authorization/roleAssignments/${roleAssignmentId}?api-version=2022-04-01`;
      
      const requestBody = {
        properties: {
          roleDefinitionId: `/subscriptions/${subscriptionId}/providers/Microsoft.Authorization/roleDefinitions/${contributorRoleId}`,
          principalId: principalId,
          principalType: 'ServicePrincipal'
        }
      };

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok || response.status === 201) {
        sendLog(ws, 'cicd-setup', '✅ Alternative approach succeeded - permissions assigned');
      } else if (response.status === 409) {
        sendLog(ws, 'cicd-setup', '✅ Permissions already exist');
      } else {
        const errorText = await response.text();
        throw new Error(`Alternative approach also failed: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      throw new Error(`Both role assignment methods failed: ${error.message}`);
    }
  }

  async createFederatedCredential(ws, resourceGroupName, identityName, githubOwner, githubRepo) {
    sendLog(ws, 'cicd-setup', '🔗 Creating federated identity credential...');
    
    try {
      const credentialName = 'github-actions-federated-credential';
      
      const response = await fetch(
        `https://management.azure.com/subscriptions/${this.subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.ManagedIdentity/userAssignedIdentities/${identityName}/federatedIdentityCredentials/${credentialName}?api-version=2023-01-31`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            properties: {
              issuer: 'https://token.actions.githubusercontent.com',
              subject: `repo:${githubOwner}/${githubRepo}:ref:refs/heads/main`,
              audiences: ['api://AzureADTokenExchange']
            }
          })
        }
      );

      if (response.ok || response.status === 201) {
        sendLog(ws, 'cicd-setup', '✅ Federated credential created successfully');
      } else if (response.status === 409) {
        sendLog(ws, 'cicd-setup', '✅ Federated credential already exists');
      } else {
        const errorText = await response.text();
        throw new Error(`Failed to create federated credential: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      throw new Error(`Federated credential creation failed: ${error.message}`);
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

    // Get the live application URL
    try {
      sendLog(ws, 'azure-setup', '🔍 Getting application URL...');
      const appResponse = await fetch(
        `https://management.azure.com/subscriptions/${azureService.subscriptionId}/resourceGroups/${payload.resourceGroup}/providers/Microsoft.App/containerApps/${payload.appName}?api-version=2023-05-01`,
        {
          headers: {
            'Authorization': `Bearer ${azureService.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (appResponse.ok) {
        const app = await appResponse.json();
        if (app.properties?.configuration?.ingress?.fqdn) {
          const liveUrl = `https://${app.properties.configuration.ingress.fqdn}`;
          sendLog(ws, 'azure-setup', '');
          sendLog(ws, 'azure-setup', '🌐 ═══════════════════════════════════════');
          sendLog(ws, 'azure-setup', `🚀 Live Application URL: ${liveUrl}`);
          sendLog(ws, 'azure-setup', '🌐 ═══════════════════════════════════════');
          sendLog(ws, 'azure-setup', '');
          sendLog(ws, 'azure-setup', '✅ Your application is now live and accessible!');
          sendLog(ws, 'azure-setup', '📋 Next: Configure CI/CD for automatic deployments');
        } else {
          sendLog(ws, 'azure-setup', '⚠️ Application URL not yet available - container may still be starting', 'warning');
        }
      }
    } catch (urlError) {
      sendLog(ws, 'azure-setup', '⚠️ Could not retrieve application URL', 'warning');
    }

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

// CI/CD Setup Handler
export async function handleCICDSetup(ws, payload) {
  const azureService = new RestAPIAzureService();
  
  try {
    sendStatus(ws, 'cicd-setup', 'starting');
    sendLog(ws, 'cicd-setup', '🔄 Setting up continuous deployment with GitHub Actions...');

    // Authenticate
    await azureService.authenticateWithBrowser(ws);
    await azureService.getSubscriptionViaRestAPI(ws, payload.subscriptionId);

    // Step 1: Create User-Assigned Managed Identity
    const identityName = `${payload.appName}-github-identity`;
    await azureService.createManagedIdentity(ws, payload.resourceGroup, identityName, payload.location);

    // Step 2: Get identity details for OIDC setup
    const identityDetails = await azureService.getManagedIdentityDetails(ws, payload.resourceGroup, identityName);

    // Step 3: Assign permissions to the identity
    await azureService.assignIdentityPermissions(ws, azureService.subscriptionId, payload.resourceGroup, identityDetails.principalId);

    // Step 4: Create federated identity credential
    await azureService.createFederatedCredential(ws, payload.resourceGroup, identityName, payload.githubOwner, payload.githubRepo);

    // Step 5: Display the secrets for GitHub
    sendLog(ws, 'cicd-setup', '🔑 GitHub Secrets Configuration:', 'info');
    sendLog(ws, 'cicd-setup', '📋 Add these secrets to your GitHub repository:', 'info');
    sendLog(ws, 'cicd-setup', '', 'info');
    sendLog(ws, 'cicd-setup', '🗝️ Required GitHub Repository Secrets:', 'info');
    sendLog(ws, 'cicd-setup', `AZURE_CLIENT_ID: ${identityDetails.clientId}`, 'info');
    sendLog(ws, 'cicd-setup', `AZURE_TENANT_ID: ${identityDetails.tenantId}`, 'info');
    sendLog(ws, 'cicd-setup', `AZURE_SUBSCRIPTION_ID: ${azureService.subscriptionId}`, 'info');
    sendLog(ws, 'cicd-setup', '', 'info');
    sendLog(ws, 'cicd-setup', '🔐 For Private Repository Access:', 'info');
    sendLog(ws, 'cicd-setup', 'GHCR_TOKEN: [Create a GitHub Personal Access Token]', 'info');
    sendLog(ws, 'cicd-setup', '📦 Token needs: write:packages, read:packages permissions', 'info');
    sendLog(ws, 'cicd-setup', '', 'info');
    sendLog(ws, 'cicd-setup', '📍 To add secrets: Go to your repository → Settings → Secrets and variables → Actions', 'info');

    sendLog(ws, 'cicd-setup', '✅ OIDC configuration completed!', 'info');
    sendLog(ws, 'cicd-setup', '📋 Ready to download enhanced workflow file', 'info');

    sendStatus(ws, 'cicd-setup', 'completed', {
      message: 'CI/CD setup completed!',
      secrets: {
        AZURE_CLIENT_ID: identityDetails.clientId,
        AZURE_TENANT_ID: identityDetails.tenantId,
        AZURE_SUBSCRIPTION_ID: azureService.subscriptionId
      },
      identityName: identityName
    });

  } catch (error) {
    sendLog(ws, 'cicd-setup', `❌ CI/CD setup failed: ${error.message}`, 'error');
    sendStatus(ws, 'cicd-setup', 'failed', { error: error.message });
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

    // Parse the container URL to get the correct image name
    const parsed = azureService.parseGitHubContainerUrl(payload.githubContainerUrl);
    let imageUrl;
    
    if (parsed) {
      imageUrl = parsed.imageUrl;
      sendLog(ws, 'azure-deploy', `🔍 Parsed container URL: ${imageUrl}`);
    } else if (payload.containerImageName && payload.githubOwner) {
      imageUrl = `ghcr.io/${payload.githubOwner}/${payload.containerImageName}:latest`;
      sendLog(ws, 'azure-deploy', `🔍 Using containerImageName: ${imageUrl}`);
    } else {
      // Fallback to legacy format
      imageUrl = `ghcr.io/${payload.githubOwner}/${payload.githubRepo}:latest`;
      sendLog(ws, 'azure-deploy', `🔍 Using legacy format: ${imageUrl}`);
    }
    
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