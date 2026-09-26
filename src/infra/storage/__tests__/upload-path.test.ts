import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveUploadPath } from '../index';

const ROOT = path.join('/app', 'public', 'uploads');

describe('resolveUploadPath', () => {
  it('allows ordinary generated keys', () => {
    expect(resolveUploadPath('personalizations/2026/09/1758.jpg', ROOT)).toBe(
      path.join(ROOT, 'personalizations/2026/09/1758.jpg'),
    );
    expect(resolveUploadPath('products/12_abc123.png', ROOT)).toBe(
      path.join(ROOT, 'products/12_abc123.png'),
    );
  });

  it('rejects traversal out of the root', () => {
    expect(resolveUploadPath('../../../etc/passwd', ROOT)).toBeNull();
    expect(resolveUploadPath('products/../../../../etc/passwd', ROOT)).toBeNull();
    expect(resolveUploadPath('..', ROOT)).toBeNull();
  });

  it('rejects Windows-style traversal separators', () => {
    expect(resolveUploadPath('..\\..\\..\\windows\\system32\\config\\sam', ROOT)).toBeNull();
  });

  it('rejects absolute keys', () => {
    expect(resolveUploadPath('/etc/passwd', ROOT)).toBeNull();
    expect(resolveUploadPath(path.join(ROOT, 'ok.jpg'), ROOT)).toBeNull();
  });

  it('rejects NUL bytes', () => {
    expect(resolveUploadPath('products/1.jpg\0.txt', ROOT)).toBeNull();
  });

  it('rejects empty and non-string keys', () => {
    expect(resolveUploadPath('', ROOT)).toBeNull();
    expect(resolveUploadPath(undefined as unknown as string, ROOT)).toBeNull();
  });

  // Regression: a bare startsWith(root) check accepted these, because the
  // sibling directory name merely shares the root as a string prefix.
  it('rejects sibling directories that merely share the root as a prefix', () => {
    expect(resolveUploadPath('../uploads-secret/evil.txt', ROOT)).toBeNull();
    expect(resolveUploadPath('../uploadsbackup/evil.txt', ROOT)).toBeNull();
  });

  it('never resolves outside the root for any traversal depth', () => {
    for (let depth = 1; depth <= 8; depth += 1) {
      const key = `${'../'.repeat(depth)}escaped.txt`;
      expect(resolveUploadPath(key, ROOT)).toBeNull();
    }
  });
});
