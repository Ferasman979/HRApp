import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const sdk = new NodeSDK({
    resource: resourceFromAttributes({
        [SemanticResourceAttributes.SERVICE_NAME]: 'hr-app-frontend',
    }),
    traceExporter: new OTLPTraceExporter({
        // Point to the OTel Collector we added in Terraform
        // In k8s/ACA, we use the service name. For internal comms in ACA environemnt:
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://hr-app-collector:4317',
    }),
    instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
