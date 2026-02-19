/**
 * Reproduction for issue #6910
 * Checksum mismatch when fetching compressed files from S3 in browser
 * 
 * Requirements:
 * - S3 object with Content-Encoding: br metadata
 * - CRC32 checksum enabled
 * - Must actually CONSUME the stream (not just transform it)
 */

import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const client = new S3Client({
	region: "us-east-1",
	credentials: {
		accessKeyId: "test",
		secretAccessKey: "test",
	},
	// For public bucket access
	signer: { sign: async (req) => req },
	// WORKAROUND: Uncomment to skip checksum validation
	// responseChecksumValidation: "WHEN_REQUIRED",
});

console.log("Fetching compressed file from S3...");

try {
	const result = await client.send(
		new GetObjectCommand({
			Bucket: "s3-compression-checksum-reproduction",
			Key: "uncompressed.txt.br",
		})
	);

	console.log("✓ GetObject succeeded");
	console.log("Response metadata:", {
		ContentEncoding: result.ContentEncoding,
		ContentType: result.ContentType,
		ChecksumCRC32: result.ChecksumCRC32,
	});

	// Transform to web stream
	const webStream = await result.Body.transformToWebStream();
	console.log("✓ Transformed to web stream");

	// CRITICAL: Must actually consume the stream to trigger checksum validation
	// This is where the error occurs
	const response = new Response(webStream);
	console.log("✓ Created Response object");
	
	console.log("Reading stream (this triggers checksum validation)...");
	const text = await response.text();
	
	console.log("✓ SUCCESS: Stream consumed without error");
	console.log("File contents:", text);
	
} catch (error) {
	console.error("✗ ERROR:", error.message);
	console.error("Full error:", error);
	process.exit(1);
}
