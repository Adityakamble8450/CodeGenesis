import { SANDBOX_NAMESPACE, k8sCoreV1Api } from './config.js';

export async function createService(sandboxId) {
    const serviceManifest = {
        metadata: {
            name: `sandbox-service-${sandboxId}`,
            labels: {
                app: 'sandbox',
                role: 'preview',
                sandboxId
            }
        },
        spec: {
            selector: {
                app: 'sandbox',
                role: 'preview',
                sandboxId
            },
            ports: [
                {
                    name: 'http',
                    port: 80,
                    targetPort: 5173,
                    protocol: 'TCP'
                }
            ],
            type: 'ClusterIP'
        }
    };

    return k8sCoreV1Api.createNamespacedService({
        namespace: SANDBOX_NAMESPACE,
        body: serviceManifest
    });
}
