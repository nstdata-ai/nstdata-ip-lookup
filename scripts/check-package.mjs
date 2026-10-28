import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync, rmSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(import.meta.url);
assert.ok(process.env.npm_execpath, 'Run npm run check:package');
const npm = (args, cwd) => execFileSync(process.execPath, [process.env.npm_execpath, ...args], { cwd, encoding: 'utf8', timeout: 30000 });
const temp = mkdtempSync(join(tmpdir(), 'nstdata-ip-package-'));
try {
    const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));
    assert.equal(manifest.version, '1.0.0');
    assert.equal(manifest.version, lock.version);
    assert.equal(manifest.version, lock.packages[''].version);
    assert.equal(manifest.dependencies, undefined);
    const guides = ['README.md', 'README_zh.md'].map(name => readFileSync(join(root, name), 'utf8'));
    for (const guide of guides) assert.ok(guide.split('\n').includes('npm install @nstdata-ai/ip-lookup'), 'README installation command mismatch');
    assert.deepEqual(...guides.map(guide => [...guide.matchAll(/```sh\n([\s\S]*?)```/g)].map(match => match[1])));
    assert.deepEqual(...guides.map(guide => [...guide.matchAll(/```js\n([\s\S]*?)```/g)].map(match => match[1])));
    const programs = guides.map(guide => [...guide.matchAll(/```js\n([\s\S]*?)```/g)].map(match => match[1]));
    const features = ['docs/guide.md', 'docs/guide_zh.md'].map(name => readFileSync(join(root, name), 'utf8'));
    const featurePrograms = features.map(guide => [...guide.matchAll(/```js\n([\s\S]*?)```/g)].map(match => match[1]));
    assert.deepEqual(...featurePrograms);
    assert.equal(programs[0].length, 1);
    assert.equal(featurePrograms[0].length, 1);
    assert.ok(readFileSync(join(root, 'CHANGELOG.md'), 'utf8').split('\n').includes(`## ${manifest.version}`), 'CHANGELOG version mismatch');
    const [pack] = JSON.parse(npm(['pack', '--json', '--ignore-scripts', '--pack-destination', temp], root));
    assert.equal(pack.name, '@nstdata-ai/ip-lookup');
    assert.equal(pack.version, manifest.version);
    const required = ['package.json', 'src/index.js', 'src/index.d.ts', 'src/cli.js',
        'README.md', 'README_zh.md', 'LICENSE', 'CHANGELOG.md', 'CONTRIBUTING.md',
        'SECURITY.md', 'docs/guide.md', 'docs/guide_zh.md'];
    assert.deepEqual(pack.files.map(file => file.path).sort(), required.sort());
    for (const file of pack.files) {
        const text = readFileSync(join(root, file.path), 'utf8');
        assert.doesNotMatch(text, /-----BEGIN (?:[A-Z]+ )*PRIVATE KEY-----|\bnpm_[a-zA-Z0-9]{30,}\b|\bgh[pousr]_[a-zA-Z0-9]{20,}\b|\/Users\/|_planning\//);
        if (file.path.endsWith('.md')) for (const [, link] of text.matchAll(/\[[^\]\n]+\]\(([^)\n]+)\)/g)) {
            if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(link)) continue;
            const [relative, anchor] = link.split('#');
            const linked = relative ? join(root, dirname(file.path), relative) : join(root, file.path);
            assert.ok(existsSync(linked), `Missing documentation link: ${link}`);
            if (anchor) {
                const slugs = [...readFileSync(linked, 'utf8').matchAll(/^#+ (.+)$/gm)].map(match =>
                    match[1].toLowerCase().replace(/[^\p{L}\p{N}_ -]/gu, '').replaceAll(' ', '-'));
                assert.ok(slugs.includes(anchor), `Missing documentation anchor: ${link}`);
            }
        }
    }
    writeFileSync(join(temp, 'package.json'), '{"private":true,"type":"module"}\n');
    const archive = process.argv[2] ? resolve(process.argv[2]) : join(temp, pack.filename);
    npm(['install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', '--cache', join(temp, 'empty-cache'), archive], temp);
    const installed = join(temp, 'node_modules/@nstdata-ai/ip-lookup');
    const installedFiles = readdirSync(installed, { recursive: true })
        .filter(name => statSync(join(installed, name)).isFile()).map(name => name.split(sep).join('/'));
    assert.deepEqual(installedFiles.sort(), required.sort());
    assert.equal(JSON.parse(readFileSync(join(temp, 'node_modules/@nstdata-ai/ip-lookup/package.json'), 'utf8')).version, manifest.version);
    for (const file of required) {
        assert.deepEqual(readFileSync(join(temp, 'node_modules/@nstdata-ai/ip-lookup', file)), readFileSync(join(root, file)),
            `Installed package differs from source: ${file}`);
    }
    const declaration = manifest.exports?.['.']?.types;
    // TypeScript may fall back to an adjacent declaration when this path is wrong.
    assert.ok(typeof declaration === 'string' && declaration.startsWith('./') && declaration.endsWith('.d.ts') && required.includes(declaration.slice(2)) &&
        existsSync(join(temp, 'node_modules/@nstdata-ai/ip-lookup', declaration)), 'Exported declaration missing');
    const bin = join(temp, 'node_modules/.bin/nstdata-ip-lookup');
    assert.ok(existsSync(bin), 'Installed CLI missing');
    assert.match(execFileSync(bin, ['--help'], { cwd: temp, env: { PATH: dirname(process.execPath) }, encoding: 'utf8', timeout: 10000 }), /Usage: nstdata-ip-lookup/);
    mkdirSync(join(temp, 'test'));
    copyFileSync(join(root, 'test/lookup.test.mjs'), join(temp, 'test/lookup.test.mjs'));
    execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'test/lookup.test.mjs'], {
        cwd: temp, env: { NSTDATA_IP_LOOKUP_INSTALLED: '1' }, timeout: 20000, stdio: 'inherit',
    });
    writeFileSync(join(temp, 'consumer.ts'), readFileSync(join(root, 'test/types.ts'), 'utf8').replace('../src/index.js', '@nstdata-ai/ip-lookup'));
    execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '--noEmit', '--strict', '--module', 'nodenext', '--target', 'es2022', 'consumer.ts'], {
        cwd: temp, timeout: 20000, stdio: 'inherit',
    });
    for (const [index, program] of [programs[0][0], featurePrograms[0][0]].entries()) {
        writeFileSync(join(temp, 'example.mjs'), `
import assert from 'node:assert/strict';
let calls = 0;
const outputs = [];
console.log = value => outputs.push(value);
globalThis.fetch = async (url, init) => {
    calls++;
    assert.equal(url.toString(), 'https://api.nstdata.io/api/v2/public/utility/ip-lookup?ipOrHost=1.1.1.1');
    assert.equal(init.method, 'GET');
    assert.equal(init.redirect, 'manual');
    return new Response(JSON.stringify({ err: false, code: 200,
        data: { status: 'success', query: '1.1.1.1', country: 'Example', proxy: false, lat: 0 } }));
};
${program}
assert.equal(calls, 1);
${index === 0 ? "assert.equal(outputs[0].query, '1.1.1.1');" : 'assert.equal(first.cached, false); assert.equal(second.cached, true);'}
`);
        execFileSync(process.execPath, ['example.mjs'], { cwd: temp, timeout: 10000, stdio: 'inherit' });
    }
    console.log(`PASS: ${pack.files.length} exact package files; empty-cache offline install, public package import/types, installed CLI, bilingual examples and synthetic/loopback regressions`);
} finally { rmSync(temp, { recursive: true, force: true }); }
