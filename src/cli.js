#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { createRequire } from 'node:module';
import { lookupIp, IpLookupError } from './index.js';

let values;
try {
    ({ values } = parseArgs({ options: { ip: { type: 'string' }, current: { type: 'boolean' },
        timeout: { type: 'string' }, help: { type: 'boolean', short: 'h' }, version: { type: 'boolean' } }, strict: true }));
    if (values.help || values.version) {
        if (Object.keys(values).length !== 1) throw new IpLookupError('USAGE');
        if (values.version) {
            console.log(createRequire(import.meta.url)('../package.json').version);
        } else console.log(`Usage: nstdata-ip-lookup (--ip <IPv4-or-IPv6> | --current) [--timeout <milliseconds>]

Options:
  --ip <address>       Query one literal IPv4 or IPv6 address
  --current            Query the address observed by the Nstdata service
  --timeout <ms>       Whole-query deadline; default 10000
  --help, -h           Show usage without querying the service
  --version            Show the installed package version without querying

Examples:
  nstdata-ip-lookup --ip 1.1.1.1
  nstdata-ip-lookup --current

Queries use the public Nstdata endpoint. No API key is required.`);
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
