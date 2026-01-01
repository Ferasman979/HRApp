import client from 'prom-client';

// Create a Registry
export const register = new client.Registry();

// Add a default label which is added to all metrics
register.setDefaultLabels({
    app: 'hrapp-frontend'
});

// Enable the collection of default metrics
client.collectDefaultMetrics({ register });

// Custom Metrics
export const httpRequestDurationMicroseconds = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'code'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
    registers: [register]
});
