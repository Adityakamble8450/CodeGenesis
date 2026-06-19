import express from 'express';
import morgan from 'morgan';
import httpProxy from 'http-proxy';

const app = express();
const proxy = httpProxy.createProxyServer({ ws: true });

app.use(morgan('combined'));

app.get('/api/status/healthz', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

app.get('/api/status/readyz', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

app.use((req, res) => {
    const host = req.headers.host || '';
    const sandboxId = host.split('.')[0];

    if (!sandboxId || sandboxId === 'preview') {
        return res.status(400).json({
            message: 'Use a sandbox subdomain like <sandboxId>.preview.localhost'
        });
    }

    const target = `http://sandbox-service-${sandboxId}`;

    return proxy.web(req, res, {
        target,
        changeOrigin: true
    });
});

export default app;
