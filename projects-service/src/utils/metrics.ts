// Prometheus Metrics for Projects Service
// ЛР8 - Моніторинг і логування

import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

// Create a Registry to register metrics
export const register = new Registry();

// Add default metrics (CPU, Memory, etc.)
collectDefaultMetrics({
  register,
  prefix: 'projects_service_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
});

// Custom Metrics

// HTTP Request counter
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

// HTTP Request duration histogram
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});

// Events published counter
export const eventsPublishedTotal = new Counter({
  name: 'events_published_total',
  help: 'Total number of events published to RabbitMQ',
  labelNames: ['event_type'],
  registers: [register],
});

// Database connections gauge
export const dbConnectionsActive = new Gauge({
  name: 'db_connections_active',
  help: 'Number of active database connections',
  registers: [register],
});

// Project operations counter
export const projectOperationsTotal = new Counter({
  name: 'project_operations_total',
  help: 'Total number of project operations',
  labelNames: ['operation'],
  registers: [register],
});

// Database query duration histogram
export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['query_type'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
});

// Middleware to track HTTP metrics
export const metricsMiddleware = (req: any, res: any, next: any) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;
    const method = req.method;
    const status = res.statusCode.toString();

    // Increment request counter
    httpRequestsTotal.inc({ method, route, status });

    // Record request duration
    httpRequestDuration.observe({ method, route, status }, duration);
  });

  next();
};

// Export function to get metrics
export const getMetrics = async (): Promise<string> => {
  return register.metrics();
};

// Export function to get content type
export const getContentType = (): string => {
  return register.contentType;
};
