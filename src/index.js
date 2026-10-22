import { isIP } from 'node:net';

export class IpLookupError extends Error {
    constructor(code, { statusCode, apiCode } = {}) {
        super(`IP lookup failed: ${code}`);
        this.name = 'IpLookupError';
        this.code = code;
        this.statusCode = statusCode;
        this.apiCode = apiCode;
    }
}

const stringFields = ['continent', 'continentCode', 'country', 'countryCode', 'region', 'regionName',
    'city', 'district', 'zip', 'timezone', 'currency', 'isp', 'org', 'as', 'asname', 'reverse'];
const numberFields = ['lat', 'lon', 'offset'];
const booleanFields = ['mobile', 'proxy', 'hosting'];

/** One request without retries, redirects or local caching. */
export async function lookupIp(ip, { baseURL = 'https://api.nstdata.io', timeoutMs = 10000,
    maxResponseBytes = 1048576, signal, fetch: request = globalThis.fetch } = {}) {
    if (ip !== undefined && (typeof ip !== 'string' || !isIP(ip))) throw new IpLookupError('INVALID_IP');
    let base;
    try { base = new URL(baseURL); } catch { throw new IpLookupError('INVALID_CONFIG'); }
    if (!['https:', 'http:'].includes(base.protocol) || base.username || base.password || base.search || base.hash ||
        !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 2147483647 ||
        !Number.isSafeInteger(maxResponseBytes) || maxResponseBytes < 1 || typeof request !== 'function' ||
        (signal !== undefined && !(signal instanceof AbortSignal))) {
        throw new IpLookupError('INVALID_CONFIG');
    }
    if (signal?.aborted) throw new IpLookupError('CANCELLED');
    const url = new URL(`${base.toString().replace(/\/+$/, '')}/api/v2/public/utility/ip-lookup`);
    if (ip !== undefined) url.searchParams.set('ipOrHost', ip);
    const deadline = AbortSignal.timeout(timeoutMs);
    const active = signal ? AbortSignal.any([signal, deadline]) : deadline;
    try {
        const response = await request(url, { method: 'GET', signal: active, redirect: 'manual', headers: { Accept: 'application/json' } });
        if (!response.ok) {
            await response.body?.cancel().catch(() => {});
            throw new IpLookupError('HTTP_ERROR', { statusCode: response.status });
        }
        const chunks = [];
        let size = 0;
        if (response.body) {
            const reader = response.body.getReader();
            try {
                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;
                    size += value.byteLength;
                    if (size > maxResponseBytes) {
                        await reader.cancel().catch(() => {});
                        throw new IpLookupError('RESPONSE_LIMIT');
                    }
                    chunks.push(value);
                }
            } finally { reader.releaseLock(); }
        }
        let envelope;
        try { envelope = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks))); }
        catch { throw new IpLookupError('INVALID_RESPONSE'); }
        if (!envelope || typeof envelope.err !== 'boolean' || typeof envelope.code !== 'number' || !Number.isFinite(envelope.code)) throw new IpLookupError('INVALID_RESPONSE');
        if (envelope.err || envelope.code !== 200) throw new IpLookupError('API_ERROR', { statusCode: response.status, apiCode: envelope.code });
        const data = envelope.data;
        if (!data || data.status !== 'success' || typeof data.query !== 'string' || !isIP(data.query)) throw new IpLookupError('INVALID_RESPONSE');
        const information = { query: data.query };
        for (const [fields, type] of [[stringFields, 'string'], [numberFields, 'number'], [booleanFields, 'boolean']]) {
            for (const field of fields) {
                if (data[field] === undefined) continue;
                if (data[field] !== null && (typeof data[field] !== type || (type === 'number' && !Number.isFinite(data[field])))) {
                    throw new IpLookupError('INVALID_RESPONSE');
                }
                information[field] = data[field];
            }
        }
        return { source: 'nstdata-public-ip-lookup', requestedIp: ip ?? null, information,
            retrievedAt: new Date().toISOString(), sourceUpdatedAt: null, cached: false };
    } catch (error) {
        if (error instanceof IpLookupError) throw error;
        if (signal?.aborted) throw new IpLookupError('CANCELLED');
        if (deadline.aborted) throw new IpLookupError('TIMEOUT');
        throw new IpLookupError('NETWORK_ERROR');
    }
}

/** Optional process-local cache; omitted-IP queries always reach the service. */
export function createIpLookup({ cacheTtlMs = 0, maxCacheEntries = 100, ...options } = {}) {
    if (!Number.isInteger(cacheTtlMs) || cacheTtlMs < 0 || cacheTtlMs > 2147483647 ||
        !Number.isSafeInteger(maxCacheEntries) || maxCacheEntries < 1) throw new IpLookupError('INVALID_CONFIG');
    const entries = new Map();
    return {
        async lookup(ip, { signal } = {}) {
            if (signal !== undefined && !(signal instanceof AbortSignal)) throw new IpLookupError('INVALID_CONFIG');
            if (signal?.aborted) throw new IpLookupError('CANCELLED');
            const entry = entries.get(ip);
            if (entry && performance.now() < entry.expiresAt) {
                entries.delete(ip);
                entries.set(ip, entry);
                return { ...structuredClone(entry.result), cached: true };
            }
            entries.delete(ip);
            const result = await lookupIp(ip, { ...options, signal });
            if (ip !== undefined && cacheTtlMs > 0) {
                entries.delete(ip);
                if (entries.size >= maxCacheEntries) entries.delete(entries.keys().next().value);
                entries.set(ip, { result: structuredClone(result), expiresAt: performance.now() + cacheTtlMs });
            }
            return result;
        },
        clearCache() { entries.clear(); },
    };
}
