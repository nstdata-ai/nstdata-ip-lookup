import { lookupIp, createIpLookup, IpLookupError } from '../src/index.js';
async function typedConsumer() {
    const result = await lookupIp('1.1.1.1', { signal: new AbortController().signal });
    const city: string | null | undefined = result.information.city;
    const proxy: boolean | null | undefined = result.information.proxy;
    const source: 'nstdata-public-ip-lookup' = result.source;
    const client = createIpLookup({ cacheTtlMs: 60000, maxCacheEntries: 100 });
    const cached = await client.lookup('1.1.1.1', { signal: new AbortController().signal });
    const retrievedAt: string = cached.retrievedAt;
    const sourceUpdatedAt: null = cached.sourceUpdatedAt;
    const cacheHit: boolean = cached.cached;
    client.clearCache();
    return { city, proxy, source, retrievedAt, sourceUpdatedAt, cacheHit };
}
const error = new IpLookupError('HTTP_ERROR', { statusCode: 400 });
const code: string = error.code;
void typedConsumer;
void code;
