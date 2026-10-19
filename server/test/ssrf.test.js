import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extractReadableText, isPrivateAddress } from '../src/services/fetchUrl.js';

test('blocks private, loopback, link-local and reserved addresses', () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '192.168.1.1', '169.254.169.254', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1']) {
    assert.equal(isPrivateAddress(ip), true, ip);
  }
});

test('allows public addresses', () => {
  for (const ip of ['8.8.8.8', '93.184.216.34', '2606:4700:4700::1111']) {
    assert.equal(isPrivateAddress(ip), false, ip);
  }
});

test('extracts title and body text, dropping scripts and navigation', () => {
  const html = '<html><head><title>Doc</title></head><body><nav>Menu</nav><script>x()</script><article><h1>Hi</h1><p>Body text.</p></article></body></html>';
  const { title, text } = extractReadableText(html);
  assert.equal(title, 'Doc');
  assert.equal(text, 'Hi\n\nBody text.');
});
