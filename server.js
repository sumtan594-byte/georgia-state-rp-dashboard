const { createServer } = require('http');
const { parse } = require('url');
const { spawnSync } = require('child_process');

process.env.NODE_ENV ||= 'production';

const next = require('next');

const port = parseInt(process.env.SERVER_PORT || process.env.PORT, 10) || 3000;
const dev = process.env.NODE_ENV === 'development';
const app = next({ dev });
const handle = app.getRequestHandler();

if (!dev && process.env.SKIP_NEXT_BUILD !== '1') {
    const nextCli = require.resolve('next/dist/bin/next');
    const build = spawnSync(process.execPath, [nextCli, 'build'], {
        cwd: __dirname,
        stdio: 'inherit',
    });

    if (build.status !== 0) {
        process.exit(build.status || 1);
    }
}

app.prepare()
    .then(() => {
        createServer((req, res) => {
            handle(req, res, parse(req.url, true));
        }).listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });
    })
    .catch((err) => {
        console.error('Failed to start server:', err);
        process.exit(1);
    });
