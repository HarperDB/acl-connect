/**
 * Integration tests for the acl-connect Harper component.
 *
 * These tests verify that Harper starts successfully with the acl-connect
 * extension loaded and that the server is accessible. The permission logic
 * (mqttPermissionCheck, resolveTopic, findTopicsForUser) is unit-tested in
 * test/permission.js; these tests focus on the component's v5 compatibility
 * at the process level.
 *
 * Note: Full MQTT publish/subscribe ACL scenarios require a running app that
 * loads the extension (see acl-connect-example for those tests).
 */
import { suite, test, before, after } from 'node:test';
import { ok } from 'node:assert/strict';
import {
    setupHarperWithFixture,
    teardownHarper,
    type ContextWithHarper,
} from '@harperfast/integration-testing';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Use the repo root as the fixture: it contains config.yaml (extensionModule: ./extension.js),
// extension.js, permission.js, and monitorEvents.js — a self-contained Harper component.
const FIXTURE_PATH = resolve(__dirname, '..');

// harper's `exports` map only exposes ".", so 'harper/dist/bin/harper.js' is not resolvable.
// Resolve the CLI from the exported main entry and pass it explicitly.
const _require = createRequire(import.meta.url);
const harperBinPath = resolve(dirname(_require.resolve('harper')), 'bin/harper.js');

function authFetch(
    ctx: ContextWithHarper,
    url: string,
    init: RequestInit & { headers?: Record<string, string> } = {},
): Promise<Response> {
    const { headers = {}, ...rest } = init;
    const creds = Buffer.from(
        `${ctx.harper.admin.username}:${ctx.harper.admin.password}`,
    ).toString('base64');
    return fetch(url, {
        ...rest,
        headers: { Authorization: `Basic ${creds}`, ...headers },
    });
}

void suite('acl-connect component', (ctx: ContextWithHarper) => {
    before(async () => {
        await setupHarperWithFixture(ctx, FIXTURE_PATH, { harperBinPath });
    });

    after(async () => {
        await teardownHarper(ctx);
    });

    void test('Harper starts successfully with acl-connect extension loaded', async () => {
        // Any non-5xx response confirms the process is alive and the extension
        // module loaded without a fatal error.
        const res = await authFetch(ctx, `${ctx.harper.httpURL}/`);
        ok(res.status < 500, `expected a non-5xx response, got ${res.status}`);
    });

    void test('Operations API returns a JSON response', async () => {
        const res = await authFetch(ctx, ctx.harper.operationsAPIURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ operation: 'user_info' }),
        });
        ok(res.status < 500, `expected a non-5xx status, got ${res.status}`);
        const contentType = res.headers.get('content-type') ?? '';
        ok(
            contentType.includes('application/json'),
            `expected JSON response, got: ${contentType}`,
        );
        const body = await res.json();
        ok(
            typeof body === 'object' && body !== null,
            'response body should be a JSON object',
        );
    });
});
