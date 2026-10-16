/**
 * Web QA Automation Scripts - Server & Mock API Backend
 * Author: Szymon Kochanowski (QA Engineer)
 * License: MIT
 */

import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json());

// ==========================================
// FAULT INJECTION STATE (Chaos QA Simulator)
// ==========================================
interface FaultConfig {
  inject500: boolean;
  corruptSchema: boolean;
  injectLatency: boolean;
  rejectAuth: boolean;
  stripSecurityHeaders: boolean;
}

const faults: FaultConfig = {
  inject500: false,
  corruptSchema: false,
  injectLatency: false,
  rejectAuth: false,
  stripSecurityHeaders: false,
};

// Initial Seed Data
const DEFAULT_PRODUCTS = [
  {
    id: 'prod_101',
    sku: 'QA-DEV-001',
    name: 'High-Speed Packet Sniffer',
    price: 349.0,
    currency: 'PLN',
    inStock: true,
    category: 'Network Tools',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod_102',
    sku: 'QA-DEV-002',
    name: 'Precision Logic Analyzer',
    price: 789.5,
    currency: 'PLN',
    inStock: true,
    category: 'Hardware Probes',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod_103',
    sku: 'QA-DEV-003',
    name: 'Encrypted Token Validator',
    price: 129.99,
    currency: 'EUR',
    inStock: false,
    category: 'Security Modules',
    createdAt: new Date().toISOString(),
  },
];

let productsDatabase = JSON.parse(JSON.stringify(DEFAULT_PRODUCTS));

// ==========================================
// MIDDLEWARES: LATENCY, HEADERS, FAULTS
// ==========================================
app.use('/api/mock', async (req: Request, res: Response, next: NextFunction) => {
  // 1. Inject Artificial Latency if enabled (> 800ms to breach 300ms SLA)
  if (faults.injectLatency) {
    await new Promise((resolve) => setTimeout(resolve, 850));
  }

  // 2. Set Security Headers (unless stripped by chaos toggle)
  if (!faults.stripSecurityHeaders) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Content-Security-Policy', "default-src 'self'");
  }

  // 3. Global 500 Fault (skip fault-config endpoint itself so UI can turn it off)
  if (faults.inject500 && !req.path.startsWith('/fault-config') && !req.path.startsWith('/reset')) {
    return res.status(500).json({
      error: 'InternalServerError',
      statusCode: 500,
      message: 'Simulated HTTP 500 Server Failure triggered by QA Chaos switch.',
      timestamp: new Date().toISOString(),
      stackTraceRef: 'ERR_SIMULATED_500_INJECTION',
    });
  }

  next();
});

// ==========================================
// FAULT INJECTION CONTROLLER
// ==========================================
app.get('/api/mock/fault-config', (req: Request, res: Response) => {
  res.json({
    faults,
    activeFaultsCount: Object.values(faults).filter(Boolean).length,
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/mock/fault-config', (req: Request, res: Response) => {
  const { inject500, corruptSchema, injectLatency, rejectAuth, stripSecurityHeaders } = req.body;

  if (inject500 !== undefined) faults.inject500 = Boolean(inject500);
  if (corruptSchema !== undefined) faults.corruptSchema = Boolean(corruptSchema);
  if (injectLatency !== undefined) faults.injectLatency = Boolean(injectLatency);
  if (rejectAuth !== undefined) faults.rejectAuth = Boolean(rejectAuth);
  if (stripSecurityHeaders !== undefined) faults.stripSecurityHeaders = Boolean(stripSecurityHeaders);

  res.json({
    success: true,
    message: 'Fault configuration updated',
    faults,
  });
});

app.post('/api/mock/reset', (req: Request, res: Response) => {
  faults.inject500 = false;
  faults.corruptSchema = false;
  faults.injectLatency = false;
  faults.rejectAuth = false;
  faults.stripSecurityHeaders = false;
  productsDatabase = JSON.parse(JSON.stringify(DEFAULT_PRODUCTS));

  res.json({
    success: true,
    message: 'Reset all fault injections and restored default mock database',
    faults,
  });
});

// ==========================================
// MOCK API ENDPOINTS
// ==========================================

// 1. GET /api/mock/health
app.get('/api/mock/health', (req: Request, res: Response) => {
  if (faults.corruptSchema) {
    // Corrupt health response: status is unexpected integer, missing version
    return res.json({
      status: 12345, // Violates enum ['healthy', 'degraded', 'maintenance']
      timestamp: 'CORRUPTED_NON_ISO_TIMESTAMP',
      service: '', // Violates minLength
      // missing version
      uptime: 'NaN',
    });
  }

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'web-qa-mock-service',
    version: '1.0.0',
    uptime: process.uptime(),
  });
});

// 2. POST /api/mock/auth/login
app.post('/api/mock/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body || {};

  if (faults.rejectAuth || !username || !password) {
    return res.status(401).json({
      error: 'Unauthorized',
      statusCode: 401,
      message: 'Invalid credentials or authentication token revoked.',
      timestamp: new Date().toISOString(),
    });
  }

  if (faults.corruptSchema) {
    // Corrupt auth response: token is missing, expiresIn is string 'undefined'
    return res.json({
      success: 'true', // string instead of boolean
      // token missing
      expiresIn: 'infinite',
      user: {
        id: null, // null where string expected
        email: 'invalid-email-format-without-at',
        // role missing
      },
    });
  }

  res.json({
    success: true,
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.qa_lead_verified_token_2026',
    tokenType: 'Bearer',
    expiresIn: 3600,
    user: {
      id: 'usr_qa_01',
      email: 'qa.engineer@company.local',
      role: 'QA Automation Engineer',
    },
  });
});

// 3. GET /api/mock/products
app.get('/api/mock/products', (req: Request, res: Response) => {
  let items = [...productsDatabase];

  if (faults.corruptSchema) {
    // Inject corrupt items into catalog
    items = items.map((p, idx) => {
      if (idx === 0) {
        return {
          ...p,
          id: undefined, // Missing required ID
          price: 'NaN', // String 'NaN' anomaly instead of number
          currency: 'BITCOIN', // Invalid enum
          inStock: 'yes', // String instead of boolean
        };
      }
      return p;
    });
  }

  res.json({
    items,
    total: items.length,
    timestamp: new Date().toISOString(),
  });
});

// 4. GET /api/mock/products/:id
app.get('/api/mock/products/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  if (id === 'secure-admin-view') {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        statusCode: 401,
        message: 'Bearer token required for admin endpoint inspection',
      });
    }
  }

  const product = productsDatabase.find((p: any) => p.id === id);
  if (!product) {
    return res.status(404).json({
      error: 'NotFound',
      statusCode: 404,
      message: `Entity with ID '${id}' not found in catalog.`,
    });
  }

  if (faults.corruptSchema) {
    return res.json({
      ...product,
      price: 'NaN',
      inStock: 'invalid-boolean',
    });
  }

  res.json(product);
});

// 5. POST /api/mock/products
app.post('/api/mock/products', (req: Request, res: Response) => {
  const { name, sku, price, currency, inStock, category } = req.body || {};

  // Input validation - negative test boundary
  if (!name || typeof price !== 'number' || Number.isNaN(price) || price < 0) {
    return res.status(400).json({
      error: 'BadRequest',
      statusCode: 400,
      message: 'Validation failed: name is required and price must be a positive number.',
      received: { name, price },
    });
  }

  const newProduct = {
    id: `prod_${Date.now().toString().slice(-4)}`,
    sku: sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
    name,
    price,
    currency: currency || 'PLN',
    inStock: inStock !== undefined ? Boolean(inStock) : true,
    category: category || 'General',
    createdAt: new Date().toISOString(),
  };

  productsDatabase.unshift(newProduct);

  if (faults.corruptSchema) {
    return res.status(201).json({
      ...newProduct,
      price: 'NaN',
      id: undefined,
    });
  }

  res.status(201).json(newProduct);
});

// 6. DELETE /api/mock/products/:id
app.delete('/api/mock/products/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const initialLen = productsDatabase.length;
  productsDatabase = productsDatabase.filter((p: any) => p.id !== id);

  if (productsDatabase.length === initialLen) {
    // If not found, still return 200 or 404
    return res.status(404).json({
      error: 'NotFound',
      statusCode: 404,
      message: `Cannot delete non-existent entity with ID '${id}'.`,
    });
  }

  res.status(200).json({
    success: true,
    message: `Resource '${id}' successfully deleted.`,
    deletedId: id,
  });
});

// ==========================================
// VITE MIDDLEWARE / STATIC ASSETS
// ==========================================
async function setupViteOrStatic() {
  if (isProduction) {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[web-qa-automation-scripts] Server running on http://0.0.0.0:${PORT}`);
  });
}

setupViteOrStatic().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
