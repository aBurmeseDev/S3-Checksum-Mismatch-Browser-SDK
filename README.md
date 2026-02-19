# S3 Checksum Mismatch in Browser Reproduction

Minimal reproduction for [aws-sdk-js-v3 issue #6910](https://github.com/aws/aws-sdk-js-v3/issues/6910) - Checksum mismatch when fetching compressed files from S3 in browser.

## Quick Start

```bash
npm install
npm run reproduce
```

## Expected Result

You should see a checksum mismatch error:

```
✓ GetObject succeeded
Response metadata: {
  ContentEncoding: 'br',
  ContentType: 'text/plain',
  ChecksumCRC32: 'uboIqQ=='
}
✓ Transformed to web stream
✓ Created Response object
Reading stream (this triggers checksum validation)...
✗ ERROR: Checksum mismatch: expected "uboIqQ==" but received "xrd+Yw=="
         in response header "x-amz-checksum-crc32".
```

## What's Happening

1. **S3 stores**: Brotli-compressed file with checksum of compressed data (`"uboIqQ=="`)
2. **Browser fetch**: Auto-decompresses the response (per [Fetch API spec](https://fetch.spec.whatwg.org/#http-network-fetch))
3. **SDK receives**: Decompressed stream
4. **SDK validates**: Calculates checksum of decompressed data (`"xrd+Yw=="`)
5. **Mismatch**: Compressed checksum ≠ Decompressed checksum → Error

## Important: When This Issue Occurs

This issue **only** happens when **ALL** of these conditions are met:

1. **The S3 object has `Content-Encoding` metadata set** (e.g., `br`, `gzip`, `deflate`)
   - This must be **manually added** to the object metadata in S3
   - S3 doesn't automatically set this header when uploading compressed files
   - Without this header, the browser won't auto-decompress
2. **Checksum validation is enabled** (default behavior)

3. **The response stream is actually consumed** (e.g., `response.text()`, `response.json()`, reading the stream)
   - Just fetching the object without consuming the stream won't trigger the error
   - The checksum validation happens during stream consumption

**If any of these conditions is not met, the issue won't occur.**

## Testing the Workaround

To verify the workaround works:

1. Edit `index.mjs` and uncomment this line:

   ```javascript
   responseChecksumValidation: "WHEN_REQUIRED",
   ```

2. Run again:

   ```bash
   npm run reproduce
   ```

3. Should succeed:
   ```
   ✓ SUCCESS: Stream consumed without error
   File contents: This is some content. [repeated 40 times]
   ```

## Test Configuration

- **Bucket**: `s3-compression-checksum-reproduction` (public, us-east-1)
- **File**: `uncompressed.txt.br` (Brotli compressed)
- **Metadata**: `Content-Encoding: br`, `Content-Type: text/plain`
- **Checksum**: CRC32 of compressed file

### How to Set Content-Encoding Metadata

The `Content-Encoding` metadata must be manually set on the S3 object. You can do this via:

**AWS CLI:**

```bash
aws s3 cp file.txt.br s3://bucket/file.txt.br \
  --content-encoding br \
  --metadata-directive REPLACE
```

**SDK:**

```javascript
await s3.putObject({
	Bucket: "bucket",
	Key: "file.txt.br",
	Body: compressedData,
	ContentEncoding: "br",
	ChecksumAlgorithm: "CRC32",
});
```

**Note**: S3 does **not** automatically set `Content-Encoding` when you upload a `.br`, `.gz`, or other compressed file. You must explicitly set it.

## Manual Steps

If you prefer to run manually:

```bash
# Install dependencies
npm install

# Build the browser bundle
npx rollup -c

# Run the reproduction
node dist/index.mjs
```

## Environment

- Node.js 18+ (tested with Node 20)
- SDK version: `@aws-sdk/client-s3@3.994.0` (latest as of Feb 2026)

## Files

- `index.mjs` - Main reproduction code
- `rollup.config.js` - Rollup configuration for browser bundle
- `package.json` - Dependencies and scripts

## Related

- Original issue: https://github.com/aws/aws-sdk-js-v3/issues/6910
- Customer's original repo: https://github.com/sdeneen/s3-js-sdk-checksum-bug
