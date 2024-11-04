import express from 'express';
import bodyParser from 'body-parser';
import crypto from 'crypto';
import { LinearService } from './LinearService';

const app = express();
const port = process.env.PORT || 3000;
const WEBHOOK_SECRET = process.env.LINEAR_WEBHOOK_SECRET || '';
const LINEAR_API_KEY = process.env.LINEAR_API_KEY || '';
const linearService = new LinearService(LINEAR_API_KEY);

// Middleware
app.use(bodyParser.json({
  verify: (req: express.Request, res: express.Response, buf: Buffer) => {
    (req as any).rawBody = buf.toString();
  }
}));

// Verify webhook signature
function verifyWebhookSignature(req: express.Request, res: express.Response, next: express.NextFunction) {
  const signature = crypto.createHmac("sha256", WEBHOOK_SECRET).update((req as any).rawBody).digest("hex");
  console.log('signature', signature);
  console.log('req.headers', req.headers);
  console.log('WEBHOOK_SECRET', WEBHOOK_SECRET);
  if (signature !== req.headers['linear-signature']) {
    console.log('Invalid signature');
    return res.status(400).json({ error: 'Invalid signature' });
  }
  next();
}

// Routes
app.post('/api/linear/watch-issue', verifyWebhookSignature, async (req, res) => {
  const { action, data, type, webhookTimestamp } = req.body;

  // Verify webhook timestamp
  const currentTimestamp = Date.now();
  if (Math.abs(currentTimestamp - webhookTimestamp) > 60000) {
    return res.status(400).json({ error: 'Webhook timestamp is too old' });
  }

  if (type === 'Issue') {
    await linearService.processIssueWebhook(action, data);
  }

  res.status(200).json({ message: 'Webhook processed successfully' });
});

app.get('/api/linear/projects', async (req, res) => {
  try {
    const projects = await linearService.fetchProjects();
    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

app.get('/api/linear/project/:projectId/statuses', async (req, res) => {
  try {
    const { projectId } = req.params;
    const statuses = await linearService.fetchProjectStatuses(projectId);
    res.json(statuses);
  } catch (error) {
    console.error('Error fetching project statuses:', error);
    res.status(500).json({ error: 'Failed to fetch project statuses' });
  }
});

app.get('/api/linear/issues', async (req, res) => {
  try {
    const { projectId } = req.query;
    const issues = await linearService.fetchIssues(projectId as string | undefined);
    res.json(issues);
  } catch (error) {
    console.error('Error fetching issues:', error);
    res.status(500).json({ error: 'Failed to fetch issues' });
  }
});

// Add this new route
app.patch('/api/linear/issues/:issueId', async (req, res) => {
  try {
    const { issueId } = req.params;
    const updateData = req.body;
    const updatedIssue = await linearService.updateIssue(issueId, updateData);
    if (updatedIssue) {
      res.json(updatedIssue);
    } else {
      res.status(404).json({ error: 'Issue not found or update failed' });
    }
  } catch (error) {
    console.error('Error updating issue:', error);
    res.status(500).json({ error: 'Failed to update issue' });
  }
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
