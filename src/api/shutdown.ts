import { exec, ExecException } from 'child_process';
import path from 'path';

interface ShutdownResponse {
  success: boolean;
  message: string;
}

export const shutdownEnvironment = async (): Promise<ShutdownResponse> => {
  return new Promise((resolve) => {
    const scriptPath = path.resolve(process.cwd(), 'shutdown.sh');
    
    exec(`"${scriptPath}"`, (error: ExecException | null, stdout: string, stderr: string) => {
      if (error) {
        console.error('Error executing shutdown script:', error);
        resolve({
          success: false,
          message: 'Failed to shutdown environment: ' + error.message
        });
        return;
      }

      if (stderr) {
        console.error('Shutdown script stderr:', stderr);
      }

      console.log('Shutdown script output:', stdout);
      resolve({
        success: true,
        message: 'Environment shutdown successfully'
      });
    });
  });
}; 