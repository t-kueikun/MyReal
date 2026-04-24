import { describe, expect, it } from 'vitest';
import { dataUrlToBlob } from '../lib/clientStorage';

describe('clientStorage', () => {
  it('restores a base64 data URL without fetch', async () => {
    const blob = dataUrlToBlob('data:text/plain;base64,SGVsbG8=');

    expect(blob.type).toBe('text/plain');
    expect(await blob.text()).toBe('Hello');
  });

  it('restores a percent-encoded data URL', async () => {
    const blob = dataUrlToBlob('data:text/plain,%E3%81%82');

    expect(blob.type).toBe('text/plain');
    expect(await blob.text()).toBe('あ');
  });

  it('rejects malformed data URLs', () => {
    expect(() => dataUrlToBlob('not-a-data-url')).toThrow('Invalid data URL');
  });
});
