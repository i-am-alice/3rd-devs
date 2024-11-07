import type { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';

export const chatLimiter = rateLimit({
  windowMs: 10 * 1000,
  max: 1,
  keyGenerator: (req) => {
    const forwardedFor = req.headers['x-forwarded-for'];
    return (typeof forwardedFor === 'string' 
      ? forwardedFor.split(',')[0] 
      : req.socket.remoteAddress) || '127.0.0.1';
  },
  handler: (req, res) => {
    return res.status(429).json({ error: 'Too many requests' });
  },
  skipFailedRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
});

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];
  if (!token || token !== process.env.PERSONAL_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }

  next();
};

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error in request processing:', err);
  res.status(500).json({ error: 'An error occurred while processing your request' });
};

interface Message {
  content: string;
  role: 'user' | 'assistant';
}

export const validationMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const { messages } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Invalid request: messages must be a non-empty array' });
  }

  const isValidMessage = (msg: any): msg is Message => {
    return typeof msg.content === 'string' && 
           msg.content.trim() !== '' && 
           (msg.role === 'user' || msg.role === 'assistant');
  };

  if (!messages.every(isValidMessage)) {
    return res.status(400).json({ error: 'Invalid request: each message must have a non-empty content and a role of either "user" or "assistant"' });
  }

  next();
};
