import express from 'express';
import morgan from 'morgan';
import fs from 'fs';

const app = express();
// Middleware
app.use(morgan('dev'));
app.use(express.json());

const WORKING_DIR =  "/workspace" // Get the current working directory


app.get('/', (req, res) => {
  res.status(200).json({ message: 'Hello, from sandbox agent!' , status : 'success'}); });

app.get('/list-files', async (req, res, next) => {
    try {
        const elements = await fs.promises.readdir(WORKING_DIR);

        return res.status(200).json({
            message: 'Elements in working directory',
            elements
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
        message: 'Failed to list workspace files'
    });
});



export default app;
