import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import http from 'http';
import path from 'path';
import { handleAzureSetup } from './handlers/dockerHandler.js';
import { handleAzureDeploy } from './handlers/azureHandler.js';
import { handleGitHubPush, handleMakePrivate } from './handlers/githubHandler.js';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());
app.use(express.static('dist'));

// Global process tracking
global.activeProcesses = new Map();

// GitHub OAuth configuration
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || 'your_github_client_id';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || 'your_github_client_secret';
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:3001/auth/github/callback';

// GitHub OAuth routes
app.get('/auth/github', (req, res) => {
  const scopes = 'repo,write:packages,read:packages,delete:packages';
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${scopes}&state=${Date.now()}`;
  res.redirect(githubAuthUrl);
});

app.get('/auth/github/callback', async (req, res) => {
  const { code, state } = req.query;
  
  if (!code) {
    return res.status(400).send('Authorization code not provided');
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code: code,
      }),
    });

    const tokenData = await tokenResponse.json();
    
    if (tokenData.error) {
      return res.status(400).send(`GitHub OAuth error: ${tokenData.error_description}`);
    }

    // Return success page with token (in production, use secure storage)
    res.send(`
      <html>
        <head>
          <title>GitHub Authorization Successful</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px; text-align: center; background: #0f0f0f; color: white; }
            .success { background: #1e40af; padding: 20px; border-radius: 10px; margin: 20px auto; max-width: 500px; }
            .token { background: #374151; padding: 10px; border-radius: 5px; font-family: monospace; margin: 10px 0; word-break: break-all; }
            button { background: #10b981; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; }
          </style>
        </head>
        <body>
          <div class="success">
            <h1>✅ GitHub Authorization Successful!</h1>
            <p>You can now close this window and return to the application.</p>
            <div class="token">
              <strong>Access Token:</strong><br>
              ${tokenData.access_token}
            </div>
            <button onclick="window.close()">Close Window</button>
          </div>
          <script>
            // Automatically close after 5 seconds
            setTimeout(() => window.close(), 5000);
            
            // Try to send token back to parent window
            if (window.opener) {
              window.opener.postMessage({
                type: 'github-auth-success',
                token: '${tokenData.access_token}'
              }, '*');
            }
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('GitHub OAuth error:', error);
    res.status(500).send('Internal server error during GitHub authentication');
  }
});

// Global process tracking
global.activeProcesses = new Map();

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('Client connected');
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      switch (data.type) {
        case 'azure-setup':
          await handleAzureSetup(ws, data.payload);
          break;
        case 'github-push':
          await handleGitHubPush(ws, data.payload);
          break;
        case 'azure-deploy':
          await handleAzureDeploy(ws, data.payload);
          break;
        case 'make-private':
          await handleMakePrivate(ws, data.payload);
          break;
        case 'cancel':
          cancelProcess(data.sessionId);
          break;
      }
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message
      }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

function cancelProcess(sessionId) {
  const process = global.activeProcesses.get(sessionId);
  if (process) {
    process.kill('SIGTERM');
    global.activeProcesses.delete(sessionId);
  }
}

// Serve React app for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Azure Container Template Server running on port ${PORT}`);
  console.log(`📱 Frontend: http://localhost:3000`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
});