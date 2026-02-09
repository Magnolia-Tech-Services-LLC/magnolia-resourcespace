import { describe, it, expect } from 'vitest';
import { rewriteToInternalUrl } from '../../src/utils/url-rewriter.js';

describe('rewriteToInternalUrl', () => {
  const externalBase = 'https://dam.example.com/api/';
  const internalBase = 'http://resourcespace-web/api';

  it('rewrites matching external URLs to internal', () => {
    const url = 'https://dam.example.com/pages/download.php?ref=42&size=pre';
    expect(rewriteToInternalUrl(url, externalBase, internalBase))
      .toBe('http://resourcespace-web/pages/download.php?ref=42&size=pre');
  });

  it('returns original URL when no internal URL configured', () => {
    const url = 'https://dam.example.com/pages/download.php?ref=42';
    expect(rewriteToInternalUrl(url, externalBase, undefined)).toBe(url);
  });

  it('returns original URL when URL does not match external base', () => {
    const url = 'https://other-server.com/pages/download.php?ref=42';
    expect(rewriteToInternalUrl(url, externalBase, internalBase)).toBe(url);
  });

  it('handles trailing slashes in base URLs', () => {
    const url = 'https://dam.example.com/pages/download.php?ref=42';
    expect(rewriteToInternalUrl(url, 'https://dam.example.com/api/', 'http://resourcespace-web/api/'))
      .toBe('http://resourcespace-web/pages/download.php?ref=42');
  });
});
