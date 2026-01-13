import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

// Define service name based on env or default (can be overridden by Env Vars in Dockerfile)
const SERVICE_NAME = process.env.OTEL_SERVICE_NAME || 'hr-agent-mcp';

const sdk = new NodeSDK({
    resource: resourceFromAttributes({
        [SemanticResourceAttributes.SERVICE_NAME]: SERVICE_NAME,
    }),
    traceExporter: new OTLPTraceExporter({
        // Point to Collector
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317',
    }),
    instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

console.log(`[OTel] Tracing initialized for ${SERVICE_NAME}`);

// Graceful shutdown
process.on('SIGTERM', () => {
    sdk.shutdown()
        .then(() => console.log('[OTel] Tracing terminated'))
        .catch((error) => console.log('[OTel] Error terminating tracing', error))
        .finally(() => process.exit(0));
});
