import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join } from 'node:path';
import { promisify } from 'node:util';

const execute = promisify(execFile);
const commands = text => [...text.matchAll(/```sh\n([\s\S]*?)```/g)]
    .flatMap(match => match[1].trim().split('\n').map(line => line.trim().split(/\s+/)));

export async function checkDocumentedCommands({ root, archive, manifest, files }) {
    // Use a separate directory so npm cannot discover the package-check project above it.
    const temp = mkdtempSync(join(tmpdir(), 'nstdata-ip-commands-'));
    const bytes = readFileSync(archive);
    const registryRequests = [], queries = [];
    const server = http.createServer((req, res) => {
        assert.equal(req.method, 'GET');
        assert.equal(req.headers.authorization, undefined);
        const url = new URL(req.url, 'http://127.0.0.1');
        const pathname = decodeURIComponent(url.pathname);
        res.setHeader('Content-Type', 'application/json');
        if (pathname === '/api/v2/public/utility/ip-lookup') {
            const ip = url.searchParams.get('ipOrHost');
            queries.push(ip);
            res.end(JSON.stringify({ err: false, code: 200,
                data: { status: 'success', query: ip ?? '203.0.113.10', proxy: false, lat: 0 } }));
        } else if (pathname === '/' + manifest.name) {
            registryRequests.push(pathname);
            res.end(JSON.stringify({ name: manifest.name, 'dist-tags': { latest: manifest.version },
                versions: { [manifest.version]: { ...manifest, dist: {
                    integrity: 'sha512-' + createHash('sha512').update(bytes).digest('base64'),
                    tarball: `http://127.0.0.1:${server.address().port}/package.tgz`,
                } } } }));
        } else if (pathname === '/package.tgz') {
            registryRequests.push(pathname);
            res.setHeader('Content-Type', 'application/octet-stream'); res.end(bytes);
        } else { res.writeHead(404); res.end(); }
    });
    let checked = 0;
    try {
        server.listen(0, '127.0.0.1'); await once(server, 'listening');
        const origin = `http://127.0.0.1:${server.address().port}`;
        const guard = join(temp, 'network-guard.cjs');
        writeFileSync(guard, `const net = require('node:net');
const original = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
    const value = Array.isArray(args[0]) ? args[0][0] : args[0];
    if (!value || value.host !== '127.0.0.1' || Number(value.port) !== ${server.address().port})
        throw Object.assign(new Error('Documentation check blocked a connection'), { code: 'DOCS_NETWORK_BLOCKED' });
    return Reflect.apply(original, this, args);
};\n`);
        const home = join(temp, 'home'); mkdirSync(home);
        const userconfig = join(temp, 'user.npmrc'), globalconfig = join(temp, 'global.npmrc');
        writeFileSync(userconfig, ''); writeFileSync(globalconfig, '');
        const env = { HOME: home, PATH: dirname(process.execPath) + delimiter + '/usr/bin:/bin',
            NODE_OPTIONS: '--require=' + JSON.stringify(guard), NSTDATA_IP_LOOKUP_BASE_URL: origin,
            npm_config_userconfig: userconfig, npm_config_globalconfig: globalconfig,
            npm_config_registry: origin, npm_config_ignore_scripts: 'true', npm_config_audit: 'false',
            npm_config_fund: 'false', npm_config_fetch_retries: '0', npm_config_update_notifier: 'false' };
        await assert.rejects(execute(process.execPath, ['-e',
            "require('node:net').connect({host:'203.0.113.1',port:443})"], { env, timeout: 5000 }),
        error => error.stderr.includes('DOCS_NETWORK_BLOCKED'));
        for (const language of ['', '_zh']) {
            const standalone = join(temp, 'standalone' + language); mkdirSync(standalone);
            const project = join(temp, 'project' + language); mkdirSync(project);
            writeFileSync(join(project, 'package.json'), '{"private":true,"type":"module"}\n');
            const prefix = join(temp, 'global' + language);
            const localEnv = { ...env, npm_config_prefix: prefix, npm_config_cache: join(temp, 'cache' + language) };
            const lines = [readFileSync(join(root, `README${language}.md`), 'utf8'),
                readFileSync(join(root, `docs/guide${language}.md`), 'utf8')].flatMap(commands);
            for (const command of lines) {
                if (command[0] === 'node') continue; // Library programs are executed by check-package.mjs.
                const oneShot = command[0] === 'npx' && command[1] === '--yes';
                const globalInstall = command[0] === 'npm' && command[2] === '--global';
                const globalCommand = command[0] === 'nstdata-ip-lookup';
                let cwd = globalCommand || globalInstall || oneShot ? standalone : project;
                const runEnv = { ...localEnv };
                if (oneShot) {
                    assert.deepEqual(command.slice(0, 5), ['npx', '--yes', '--package',
                        `${manifest.name}@${manifest.version}`, 'nstdata-ip-lookup']);
                    runEnv.npm_config_cache = join(temp, 'one-shot-cache-' + checked);
                } else if (command[0] === 'npm') {
                    assert.deepEqual(command, globalInstall ? ['npm', 'install', '--global', manifest.name]
                        : ['npm', 'install', manifest.name]);
                } else if (!globalCommand) {
                    assert.deepEqual(command.slice(0, 3), ['npx', '--no-install', 'nstdata-ip-lookup']);
                }
                const beforeQueries = queries.length, beforeRegistry = registryRequests.length;
                const executable = globalCommand ? join(prefix, 'bin/nstdata-ip-lookup') : process.execPath;
                const args = globalCommand ? command.slice(1) : [command[0] === 'npm' ? process.env.npm_execpath
                    : join(dirname(process.env.npm_execpath), 'npx-cli.js'), ...command.slice(1)];
                const result = await execute(executable, args, { cwd, env: runEnv, timeout: 30000 });
                assert.equal(result.stderr, '');
                const query = command.includes('--ip') || command.includes('--current');
                assert.equal(queries.length - beforeQueries, query ? 1 : 0);
                if (query) {
                    const expected = command.includes('--current') ? null : command[command.indexOf('--ip') + 1];
                    assert.equal(queries.at(-1), expected);
                    const output = JSON.parse(result.stdout);
                    assert.equal(output.requestedIp, expected);
                    assert.equal(output.information.query, expected ?? '203.0.113.10');
                    assert.equal(output.information.proxy, false); assert.equal(output.information.lat, 0);
                } else if (command.includes('--version')) assert.equal(result.stdout, manifest.version + '\n');
                else if (command.includes('--help')) assert.match(result.stdout, /Usage: nstdata-ip-lookup/);
                if (command[0] === 'npm') {
                    const installed = globalInstall ? join(prefix, 'lib/node_modules', manifest.name)
                        : join(project, 'node_modules', manifest.name);
                    for (const file of files) assert.deepEqual(readFileSync(join(installed, file)),
                        readFileSync(join(root, file)), `Documented install differs: ${file}`);
                }
                if (oneShot) assert.ok(registryRequests.slice(beforeRegistry).includes('/package.tgz'));
                if (!oneShot && command[0] !== 'npm') assert.equal(registryRequests.length, beforeRegistry);
                assert.equal(existsSync(join(standalone, 'node_modules')), false);
                assert.equal(existsSync(join(standalone, 'package.json')), false);
                checked++;
            }
        }
        return checked;
    } finally {
        await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
        rmSync(temp, { recursive: true, force: true });
    }
}
