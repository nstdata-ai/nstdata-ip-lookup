import { lookupIp, IpLookupError } from '../src/index.js';
async function typedConsumer() {
    const result = await lookupIp('1.1.1.1', { signal: new AbortController().signal });
    const city: string | null | undefined = result.information.city;
    const proxy: boolean | null | undefined = result.information.proxy;
    const source: 'nstdata-public-ip-lookup' = result.source;
    return { city, proxy, source };
}
const error = new IpLookupError('HTTP_ERROR', { statusCode: 400 });
const code: string = error.code;
void typedConsumer;
void code;
