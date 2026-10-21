import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
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
    for (const guide of guides) assert.ok(guide.includes(`npm install @nstdata-ai/ip-lookup@${manifest.version}`), 'README version mismatch');
    assert.deepEqual(...guides.map(guide => [...guide.matchAll(/```sh\n([\s\S]*?)```/g)].map(match => match[1])));
    assert.deepEqual(...guides.map(guide => [...guide.matchAll(/```js\n([\s\S]*?)```/g)].map(match => match[1])));
    assert.ok(readFileSync(join(root, 'CHANGELOG.md'), 'utf8').includes(`## ${manifest.version} — Unreleased`), 'CHANGELOG version mismatch');
    const [pack] = JSON.parse(npm(['pack', '--json', '--ignore-scripts', '--pack-destination', temp], root));
    assert.equal(pack.name, '@nstdata-ai/ip-lookup');
    assert.equal(pack.version, manifest.version);
    const required = ['package.json', 'src/index.js', 'src/index.d.ts', 'src/cli.js',
        'README.md', 'README_zh.md', 'LICENSE', 'CHANGELOG.md', 'CONTRIBUTING.md'];
    assert.deepEqual(pack.files.map(file => file.path).sort(), required.sort());
    for (const file of pack.files) {
        const text = readFileSync(join(root, file.path), 'utf8');
        assert.doesNotMatch(text, /-----BEGIN (?:[A-Z]+ )*PRIVATE KEY-----|\bnpm_[a-zA-Z0-9]{30,}\b|\bgh[pousr]_[a-zA-Z0-9]{20,}\b|\/Users\/|_planning\//);
        if (file.path.endsWith('.md')) for (const [, link] of text.matchAll(/\]\(([^)#]+)(?:#[^)]*)?\)/g)) {
            if (!link.includes('://')) assert.ok(existsSync(join(root, dirname(file.path), link)), `Missing documentation link: ${link}`);
        }
    }
    writeFileSync(join(temp, 'package.json'), '{"private":true,"type":"module"}\n');
    npm(['install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', '--cache', join(temp, 'empty-cache'), join(temp, pack.filename)], temp);
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
    execFileSync(process.execPath, ['--test', 'test/lookup.test.mjs'], {
        cwd: temp, env: { NSTDATA_IP_LOOKUP_INSTALLED: '1' }, timeout: 20000, stdio: 'inherit',
    });
    writeFileSync(join(temp, 'consumer.ts'), readFileSync(join(root, 'test/types.ts'), 'utf8').replace('../src/index.js', '@nstdata-ai/ip-lookup'));
    execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '--noEmit', '--strict', '--module', 'nodenext', '--target', 'es2022', 'consumer.ts'], {
        cwd: temp, timeout: 20000, stdio: 'inherit',
    });
    console.log(`PASS: ${pack.files.length} exact package files; empty-cache offline install, public package import/types, installed CLI and synthetic/loopback regressions`);
} finally { rmSync(temp, { recursive: true, force: true }); }
