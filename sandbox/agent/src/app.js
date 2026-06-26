import express from 'express';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';

const app = express();
const WORKING_DIR = '/workspace';

app.use(morgan('dev'));
app.use(express.json());

function resolveWorkspacePath(relativePath) {
    if (typeof relativePath !== 'string' || !relativePath.trim()) {
        const error = new Error('A non-empty file path is required');
        error.statusCode = 400;
        throw error;
    }

    const normalizedPath = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
    const resolvedPath = path.resolve(WORKING_DIR, normalizedPath);
    const relativeToWorkspace = path.relative(WORKING_DIR, resolvedPath);

    if (relativeToWorkspace.startsWith('..') || path.isAbsolute(relativeToWorkspace)) {
        const error = new Error('File path must stay within the workspace');
        error.statusCode = 400;
        throw error;
    }

    return resolvedPath;
}

function toWorkspaceKey(filePath) {
    return filePath.replace(WORKING_DIR, '') || '/';
}

app.get('/', (req, res) => {
    res.status(200).json({
        message: 'Hello, from sandbox agent!',
        status: 'success'
    });
});

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

app.get('/read-files', async (req, res, next) => {
    try {
        const files = req.query.files;

        if (typeof files !== 'string' || !files.trim()) {
            return res.status(400).json({
                message: 'No files specified in query parameter',
                status: 'error'
            });
        }

        const fileList = files
            .split(',')
            .map((file) => file.trim())
            .filter(Boolean);

        const results = await Promise.all(fileList.map(async (file) => {
            const filePath = resolveWorkspacePath(file);

            try {
                const content = await fs.promises.readFile(filePath, 'utf-8');

                return {
                    [toWorkspaceKey(filePath)]: content
                };
            } catch (error) {
                return {
                    [toWorkspaceKey(filePath)]: `Error reading file: ${error.message}`
                };
            }
        }));

        return res.status(200).json({
            message: 'File contents',
            files: results
        });
    } catch (error) {
        return next(error);
    }
});

app.patch('/update-files', async (req, res, next) => {
    try {
        const updates = req.body.updates;

        if (!Array.isArray(updates)) {
            return res.status(400).json({
                message: 'Invalid request body. Expected a JSON object with an "updates" property containing an array of file updates.',
                status: 'error'
            });
        }

        const results = await Promise.all(updates.map(async (update) => {
            const { file, content } = update ?? {};
            const filePath = resolveWorkspacePath(file);

            if (typeof content !== 'string') {
                return {
                    [toWorkspaceKey(filePath)]: 'Error updating file: content must be a string'
                };
            }

            try {
                await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
                await fs.promises.writeFile(filePath, content, 'utf-8');

                return {
                    [toWorkspaceKey(filePath)]: 'File updated successfully'
                };
            } catch (error) {
                return {
                    [toWorkspaceKey(filePath)]: `Error updating file: ${error.message}`
                };
            }
        }));

        return res.status(200).json({
            message: 'File update results',
            results
        });
    } catch (error) {
        return next(error);
    }
});

app.post('/create-files', async (req, res, next) => {
    try {
        const files = req.body.files;

        if (!Array.isArray(files)) {
            return res.status(400).json({
                message: 'Invalid request body. Expected a JSON object with a "files" property containing an array of file objects.',
                status: 'error'
            });
        }

        const results = await Promise.all(files.map(async (fileObj) => {
            const { file, content } = fileObj ?? {};
            const filePath = resolveWorkspacePath(file);

            if (typeof content !== 'string') {
                return {
                    [toWorkspaceKey(filePath)]: 'Error creating file: content must be a string'
                };
            }

            try {
                await fs.promises.mkdir(path.dirname(filePath), { recursive: true });

                const fileExists = await fs.promises
                    .access(filePath, fs.constants.F_OK)
                    .then(() => true)
                    .catch(() => false);

                if (fileExists) {
                    return {
                        [toWorkspaceKey(filePath)]: 'Error creating file: file already exists'
                    };
                }

                await fs.promises.writeFile(filePath, content, 'utf-8');

                return {
                    [toWorkspaceKey(filePath)]: 'File created successfully'
                };
            } catch (error) {
                return {
                    [toWorkspaceKey(filePath)]: `Error creating file: ${error.message}`
                };
            }
        }));

        return res.status(200).json({
            message: 'File creation results',
            results
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

    return res.status(error.statusCode || 500).json({
        message: error.message || 'Agent request failed',
        status: 'error'
    });
});

export default app;
