import express from 'express';
import morgan from 'morgan';
import { createPod } from './kubernetes/pod.js';
import { createService } from './kubernetes/service.js';
import { v7 as uuid } from 'uuid';


const app = express();
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/sandbox/health', (req, res) => {
    res.status(200).json({
        message: 'Sandbox API is healthy',
        status: 'ok'
    });
});

app.post('/api/sandbox/start', async (req, res, next) => {
    const sandboxId = uuid();

    try {
        await createPod(sandboxId);
        await createService(sandboxId);

        return res.status(201).json({
            message: 'Sandbox environment created successfully',
            sandboxId,
            previewUrl: `http://${sandboxId}.preview.localhost`,
            agentUrl: `http://${sandboxId}.agent.localhost`
        });
    } catch (error) {
        return next(error);
    }
});

app.use((error, req, res, next) => {
    console.error(error);

    if (res.headersSent) {
        return next(error);
    }

    return res.status(500).json({
        message: 'Failed to create sandbox environment'
    });
});

export default app;
