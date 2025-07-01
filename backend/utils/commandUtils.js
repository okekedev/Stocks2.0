import { spawn } from 'child_process';
import { sendLog } from './wsUtils.js';

export async function executeCommand(command, args, options, ws, sessionId, logType) {
  return new Promise((resolve, reject) => {
    sendLog(ws, logType, `$ ${command} ${args.join(' ')}`, 'command');
    
    const process = spawn(command, args, {
      ...options,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Store process for potential cancellation
    if (global.activeProcesses) {
      global.activeProcesses.set(sessionId, process);
    }

    let hasOutput = false;

    process.stdout.on('data', (data) => {
      hasOutput = true;
      const output = data.toString();
      sendLog(ws, logType, output, 'stdout');
    });

    process.stderr.on('data', (data) => {
      hasOutput = true;
      const output = data.toString();
      sendLog(ws, logType, output, 'stderr');
    });

    process.on('close', (code) => {
      if (global.activeProcesses) {
        global.activeProcesses.delete(sessionId);
      }
      
      if (code === 0) {
        if (!hasOutput) {
          sendLog(ws, logType, '✅ Command completed successfully', 'stdout');
        }
        resolve(code);
      } else {
        reject(new Error(`Process exited with code ${code}`));
      }
    });

    process.on('error', (error) => {
      if (global.activeProcesses) {
        global.activeProcesses.delete(sessionId);
      }
      reject(error);
    });
  });
}