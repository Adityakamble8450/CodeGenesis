import express from 'express';
import morgan from 'morgan';
import httpProxy from 'http-proxy';

const app = express();
const proxy = httpProxy.createProxyServer({ ws: true });
const AGENT_PATHS = new Set(['/list-files']);

app.use(morgan('combined'));

proxy.on('error', (error, req, res) => {
    console.error('Proxy error:', error.message);

    if (res.headersSent) {
        return;
    }

    res.status(502).json({
        message: 'Unable to reach sandbox service',
        status: 'error'
    });
});

app.get('/api/status/healthz', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

app.get('/api/status/readyz', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

function getRoutingTarget(hostHeader) {
    const hostname = (hostHeader || '').split(':')[0];
    const parts = hostname.split('.');

    if (parts.length < 2) {
        return {
            error: 'Use a sandbox subdomain like <sandboxId>.preview.localhost'
        };
    }

    const [sandboxId, routeType] = parts;

    if (!sandboxId || sandboxId === 'preview' || sandboxId === 'agent') {
        return {
            error: 'Use a sandbox subdomain like <sandboxId>.preview.localhost'
        };
    }

    if (routeType === 'agent') {
        return { target: `http://sandbox-service-${sandboxId}:3000` };
    }

    return { target: `http://sandbox-service-${sandboxId}` };
}

function getProxyTarget(hostHeader, path) {
    const routingResult = getRoutingTarget(hostHeader);

    if (routingResult.error || !routingResult.target) {
        return routingResult;
    }

    if (AGENT_PATHS.has(path) && !routingResult.target.endsWith(':3000')) {
        return { target: `${routingResult.target}:3000` };
    }

    return routingResult;
}

app.use((req, res) => {
    const { target, error } = getProxyTarget(req.headers.host, req.path);

    if (error) {
        return res.status(400).json({ message: error });
    }

    return proxy.web(req, res, {
        target,
        changeOrigin: true
    });
});

export default app;
