#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { lookupIp, IpLookupError } from './index.js';

let values;
try {
    ({ values } = parseArgs({ options: { ip: { type: 'string' }, current: { type: 'boolean' },
        timeout: { type: 'string' }, help: { type: 'boolean', short: 'h' } }, strict: true }));
    if (values.help) {
        console.log('Usage: nstdata-ip-lookup (--ip <IPv4-or-IPv6> | --current) [--timeout <milliseconds>]');
    } else {
        if ((values.ip !== undefined) === Boolean(values.current)) throw new IpLookupError('USAGE');
        const result = await lookupIp(values.ip, { baseURL: process.env.NSTDATA_IP_LOOKUP_BASE_URL,
            timeoutMs: values.timeout === undefined ? undefined : Number(values.timeout) });
        console.log(JSON.stringify(result));
    }
} catch (error) {
    const code = error instanceof IpLookupError ? error.code : 'USAGE';
    console.error(JSON.stringify({ error: { code,
        ...(error instanceof IpLookupError ? { statusCode: error.statusCode, apiCode: error.apiCode } : {}) } }));
    process.exitCode = ['USAGE', 'INVALID_IP', 'INVALID_CONFIG'].includes(code) ? 2 : 1;
}
