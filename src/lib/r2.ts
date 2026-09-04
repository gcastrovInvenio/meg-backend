const mimeToExtension: Record<string, string> = {
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/webp": "webp",
};

export function extensionForMime(mime: string): string | undefined {
	return mimeToExtension[mime];
}

export function getR2Key(category: string, extension: string): string {
	return `${category}/${crypto.randomUUID()}.${extension}`;
}

export async function removeUpload(
	bucket: R2Bucket,
	key: string,
): Promise<boolean> {
	const object = await bucket.get(key);
	if (!object) {
		return false;
	}
	await bucket.delete(key);
	return true;
}
