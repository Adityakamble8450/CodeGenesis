import { SANDBOX_NAMESPACE, k8sCoreV1Api } from './config.js';

export async function createPod(sandboxId) {
    const podManifest = {
        metadata: {
            name: `sandbox-pod-${sandboxId}`,
            labels: {
                app: 'sandbox',
                role: 'preview',
                sandboxId
            }
        },
        spec: {
            containers: [
                {
                    image: process.env.SANDBOX_TEMPLATE_IMAGE || 'template:latest',
                    imagePullPolicy: 'IfNotPresent',
                    name: 'sandbox-container',
                    ports: [{ containerPort: 5173, name: 'http' }],
                    resources: {
                        limits: { cpu: '250m', memory: '512Mi' },
                        requests: { cpu: '100m', memory: '128Mi' }
                    }
                }
            ]
        }
    };

    return k8sCoreV1Api.createNamespacedPod({
        namespace: SANDBOX_NAMESPACE,
        body: podManifest
    });
}
