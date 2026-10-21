import assert from 'node:assert/strict';
import { test } from 'node:test';
import http from 'node:http';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const installed = process.env.NSTDATA_IP_LOOKUP_INSTALLED === '1';
const { lookupIp, IpLookupError } = await import(installed ? '@nstdata-ai/ip-lookup' : '../src/index.js');
const cliPath = fileURLToPath(new URL(installed ? '../node_modules/.bin/nstdata-ip-lookup' : '../src/cli.js', import.meta.url));
const envelope = data => ({ code: 200, err: false, data });
const valid = { status: 'success', query: '1.1.1.1', country: 'Example', lat: 0, proxy: false };
const fixture = data => async (_url, init) => {
    assert.equal(init.method, 'GET'); assert.equal(init.redirect, 'manual');
    assert.deepEqual(init.headers, { Accept: 'application/json' });
    return new Response(JSON.stringify(data));
};

test('query uses public route, preserves unknown/false/zero fields and drops extras', async () => {
    const result = await lookupIp('1.1.1.1', { fetch: async (url, init) => {
        assert.equal(url.toString(), 'https://api.nstdata.io/api/v2/public/utility/ip-lookup?ipOrHost=1.1.1.1');
        return fixture(envelope({ ...valid, city: null, future: 'not exposed' }))(url, init);
    } });
    assert.equal(result.source, 'nstdata-public-ip-lookup');
    assert.deepEqual(result.information, { query: '1.1.1.1', country: 'Example', city: null, lat: 0, proxy: false });
    assert.equal(result.requestedIp, '1.1.1.1');
});

test('IPv6 is encoded once and current endpoint omits the target', async () => {
    for (const ip of ['2001:4860:4860::8888', undefined]) {
        const result = await lookupIp(ip, { fetch: async (url, init) => {
            assert.equal(url.searchParams.get('ipOrHost'), ip ?? null);
            return fixture(envelope({ ...valid, query: ip ?? '1.1.1.1' }))(url, init);
        } });
        assert.equal(result.requestedIp, ip ?? null);
    }
});

test('input and pre-cancellation fail without calls', async () => {
    const fetch = () => { throw new Error('unexpected request'); };
    for (const ip of ['', 'host.example', '1.2.3.999', 'http://secret@host']) await assert.rejects(lookupIp(ip, { fetch }), { code: 'INVALID_IP' });
    for (const options of [{ baseURL: 'https://user:secret@host' }, { timeoutMs: 0 }, { maxResponseBytes: 0 }]) {
        await assert.rejects(lookupIp('1.1.1.1', { ...options, fetch }), { code: 'INVALID_CONFIG' });
    }
    await assert.rejects(lookupIp('1.1.1.1', { fetch, signal: AbortSignal.abort() }), { code: 'CANCELLED' });
});

test('HTTP/auth/rate/redirect errors expose status but no raw body and no retry', async () => {
    for (const status of [302, 400, 401, 429, 500]) {
        let calls = 0;
        await assert.rejects(lookupIp('1.1.1.1', { fetch: async () => { calls++; return new Response('private-body', { status }); } }),
            error => error instanceof IpLookupError && error.statusCode === status && !String(error).includes('private-body'));
        assert.equal(calls, 1);
    }
});

test('invalid JSON, envelope, source state and field types are not manufactured success', async () => {
    for (const body of ['private not JSON', {}, { code: 200, err: false }, envelope({ ...valid, lat: '0' }), envelope({ ...valid, query: 'host' }), envelope({ status: 'fail' })]) {
        await assert.rejects(lookupIp('1.1.1.1', { fetch: async () => new Response(typeof body === 'string' ? body : JSON.stringify(body)) }), { code: 'INVALID_RESPONSE' });
    }
    await assert.rejects(lookupIp('1.1.1.1', { fetch: fixture({ code: 429, err: true, msg: 'private' }) }), { code: 'API_ERROR', apiCode: 429 });
});

test('response cap cancels the stream and network errors are generic', async () => {
    let cancelled = false;
    const body = new ReadableStream({ start(c) { c.enqueue(new Uint8Array(100)); }, cancel() { cancelled = true; } });
    await assert.rejects(lookupIp('1.1.1.1', { maxResponseBytes: 10, fetch: async () => new Response(body) }), { code: 'RESPONSE_LIMIT' });
    assert.ok(cancelled);
    await assert.rejects(lookupIp('1.1.1.1', { fetch: async () => { throw new Error('secret diagnostic'); } }), { code: 'NETWORK_ERROR' });
});

async function server(t, handler) {
    const api = http.createServer(handler);
    api.listen(0, '127.0.0.1'); await once(api, 'listening');
    t.after(async () => { const closed = new Promise(resolve => api.close(resolve)); api.closeAllConnections(); await closed; });
    return `http://127.0.0.1:${api.address().port}`;
}

test('native fetch honors a real deadline and caller cancellation', { timeout: 10000 }, async t => {
    const baseURL = await server(t, (_req, res) => { res.writeHead(200); res.write('{'); });
    await assert.rejects(lookupIp('1.1.1.1', { baseURL, timeoutMs: 40 }), { code: 'TIMEOUT' });
    const controller = new AbortController();
    const pending = lookupIp('1.1.1.1', { baseURL, signal: controller.signal });
    setTimeout(() => controller.abort(), 40);
    await assert.rejects(pending, { code: 'CANCELLED' });
});

async function cli(args, env = {}) {
    const child = spawn(process.execPath, [cliPath, ...args], { env });
    let stdout = '', stderr = '';
    child.stdout.on('data', x => stdout += x); child.stderr.on('data', x => stderr += x);
    const [code] = await once(child, 'close');
    return { code, stdout, stderr };
}

test('CLI help and invalid usage do not require a service', async () => {
    assert.equal((await cli(['--help'])).code, 0);
    assert.equal((await cli([])).code, 2);
    assert.equal((await cli(['--ip', 'invalid'])).code, 2);
});

test('CLI loopback success and HTTP failure have structured output/exit codes', async t => {
    let requests = 0;
    const baseURL = await server(t, (_req, res) => {
        requests++; res.writeHead(requests === 1 ? 200 : 400); res.end(JSON.stringify(envelope(valid)));
    });
    const env = { NSTDATA_IP_LOOKUP_BASE_URL: baseURL };
    const success = await cli(['--ip', '1.1.1.1'], env);
    assert.equal(success.code, 0); assert.equal(JSON.parse(success.stdout).information.query, '1.1.1.1');
    assert.equal(success.stderr, '');
    const failure = await cli(['--current'], env);
    assert.equal(failure.code, 1); assert.equal(JSON.parse(failure.stderr).error.statusCode, 400);
    assert.equal(failure.stdout, ''); assert.equal(requests, 2);
});

test('invalid cancellation signals fail safely before any request', async () => {
    let calls = 0;
    const fetch = async () => { calls++; throw new Error('private diagnostic'); };
    for (const signal of [null, false, 1, 'private-token', {}, { aborted: true }]) {
        await assert.rejects(lookupIp('1.1.1.1', { fetch, signal }), error => {
            assert.ok(error instanceof IpLookupError);
            assert.equal(error.code, 'INVALID_CONFIG');
            assert.doesNotMatch(String(error), /private-token|private diagnostic/);
            return true;
        });
    }
    assert.equal(calls, 0);
});

test('nonfinite API codes are malformed responses rather than error metadata', async () => {
    for (const code of ['1e309', '-1e309']) {
        let calls = 0;
        await assert.rejects(lookupIp('1.1.1.1', { fetch: async () => {
            calls++;
            return new Response(`{"err":true,"code":${code},"msg":"private diagnostic"}`);
        } }), error => {
            assert.ok(error instanceof IpLookupError);
            assert.equal(error.code, 'INVALID_RESPONSE');
            assert.equal(error.apiCode, undefined);
            assert.doesNotMatch(String(error), /private diagnostic/);
            return true;
        });
        assert.equal(calls, 1);
    }
});

test('controlled body-phase deadline and cancellation release the reader and native connection', { timeout: 10000 }, async t => {
    for (const phase of ['deadline', 'cancel']) {
        let receiving, disconnected, response, calls = 0;
        const started = new Promise(resolve => { receiving = resolve; });
        const closed = new Promise(resolve => { disconnected = resolve; });
        const baseURL = await server(t, (_req, res) => {
            res.once('close', disconnected);
            res.writeHead(200); res.write('{');
        });
        const deadline = new AbortController(), cancelled = new AbortController();
        t.mock.method(AbortSignal, 'timeout', milliseconds => {
            assert.equal(milliseconds, 40);
            return deadline.signal;
        });
        const pending = lookupIp('1.1.1.1', { baseURL, timeoutMs: 40,
            signal: phase === 'cancel' ? cancelled.signal : undefined,
            fetch: async (...args) => {
                calls++;
                response = await fetch(...args);
                const reader = response.body.getReader(), read = reader.read.bind(reader);
                t.mock.method(reader, 'read', async () => {
                    const chunk = await read();
                    if (!chunk.done) receiving();
                    return chunk;
                });
                t.mock.method(response.body, 'getReader', () => reader);
                return response;
            } });
        const rejected = assert.rejects(pending, { code: phase === 'deadline' ? 'TIMEOUT' : 'CANCELLED' });
        await started;
        if (phase === 'deadline') deadline.abort(new DOMException('Controlled test deadline', 'TimeoutError'));
        else cancelled.abort();
        await rejected;
        await closed;
        assert.equal(calls, 1);
        assert.equal(response.body.locked, false);
        t.mock.reset();
    }
});
