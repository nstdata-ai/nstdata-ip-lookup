export class IpLookupError extends Error {
    constructor(code: string, metadata?: { statusCode?: number; apiCode?: number });
    code: string;
    statusCode?: number;
    apiCode?: number;
}
export interface IpInformation {
    query: string;
    continent?: string | null; continentCode?: string | null;
    country?: string | null; countryCode?: string | null;
    region?: string | null; regionName?: string | null;
    city?: string | null; district?: string | null; zip?: string | null;
    timezone?: string | null; currency?: string | null;
    isp?: string | null; org?: string | null; as?: string | null;
    asname?: string | null; reverse?: string | null;
    lat?: number | null; lon?: number | null; offset?: number | null;
    mobile?: boolean | null; proxy?: boolean | null; hosting?: boolean | null;
}
export function lookupIp(ip?: string, options?: {
    baseURL?: string; timeoutMs?: number; maxResponseBytes?: number;
    signal?: AbortSignal; fetch?: typeof globalThis.fetch;
}): Promise<{ source: 'nstdata-public-ip-lookup'; requestedIp: string | null; information: IpInformation }>;
