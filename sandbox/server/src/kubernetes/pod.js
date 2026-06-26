import { SANDBOX_NAMESPACE, k8sCoreV1Api } from './config.js';

const TEMPLATE_SOURCE_DIR = '/workplace';

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
            volumes: [
                {
                    name: 'workspace-volume',
                    emptyDir: {}
                }
            ],
            initContainers: [
                {
                    image: 'template:latest',
                    imagePullPolicy: 'IfNotPresent',
                    name: 'sandbox-init-container',
                    command: ['sh', '-c', `cp -r ${TEMPLATE_SOURCE_DIR}/. /seed/`],
                    volumeMounts: [
                        {
                            name: 'workspace-volume',
                            mountPath: '/seed'
                        }
                    ]
                }
            ],
            containers: [
                {
                    image: process.env.SANDBOX_TEMPLATE_IMAGE || 'template:latest',
                    imagePullPolicy: 'IfNotPresent',
                    name: 'sandbox-container',
                    ports: [{ containerPort: 5173, name: 'http' }],
                    resources: {
                        limits: { cpu: '250m', memory: '512Mi' },
                        requests: { cpu: '100m', memory: '128Mi' }
                    },
                    volumeMounts: [
                        {
                            name: 'workspace-volume',
                            mountPath: '/workspace'
                        }
                    ]
                },
                {
                    image : process.env.SANDBOX_AGENT_IMAGE || 'agent:latest', 
                    imagePullPolicy: 'IfNotPresent',
                    name : 'sandbox-agent-container',
                    ports : [{ containerPort: 3000 , name : 'http'}],
                    resources: {
                        limits: { cpu: '250m', memory: '1Gi' },
                        requests: { cpu: '100m', memory: '128Mi' }
                    },
                    volumeMounts: [
                        {
                            name: 'workspace-volume',
                            mountPath: '/workspace'
                        }
                    ]
                }
            ]
        }
    };

    return k8sCoreV1Api.createNamespacedPod({
        namespace: SANDBOX_NAMESPACE,
        body: podManifest
    });
}
