import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

export class NotificationService {
  async speak(message: string): Promise<void> {
    try {
      await execPromise(`say "${message}"`);
    } catch (error) {
      console.error('Error speaking message:', error);
    }
  }
}