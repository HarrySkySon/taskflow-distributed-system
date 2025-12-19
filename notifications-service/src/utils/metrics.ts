// Prometheus Metrics for Notifications Service
// ЛР8 - Моніторинг і логування

import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

// Create a Registry to register metrics
export const register = new Registry();

// Add default metrics (CPU, Memory, etc.)
collectDefaultMetrics({
  register,
  prefix: 'notifications_service_',
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

// Events consumed counter
export const eventsConsumedTotal = new Counter({
  name: 'events_consumed_total',
  help: 'Total number of events consumed from RabbitMQ',
  labelNames: ['event_type'],
  registers: [register],
});

// Event processing duration histogram
export const eventProcessingDuration = new Histogram({
  name: 'event_processing_duration_seconds',
  help: 'Duration of event processing in seconds',
  labelNames: ['event_type'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
});

// Notifications sent counter
export const notificationsSentTotal = new Counter({
  name: 'notifications_sent_total',
  help: 'Total number of notifications sent',
  labelNames: ['notification_type'],
  registers: [register],
});

// RabbitMQ connection status gauge
export const rabbitmqConnected = new Gauge({
  name: 'rabbitmq_connected',
  help: 'RabbitMQ connection status (1 = connected, 0 = disconnected)',
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
