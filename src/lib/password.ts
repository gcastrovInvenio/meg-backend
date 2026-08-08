import { base64UrlToBytes, bytesToBase64Url } from "./encoding";

const ITERATIONS = 100_000;
const KEY_LENGTH = 64;
const HASH = "SHA-256";
const PREFIX = "pbkdf2_sha256";

const encoder = new TextEncoder();

async function deriveKey(
	password: string,
	salt: Uint8Array,
	iterations: number,
): Promise<Uint8Array> {
	const key = await crypto.subtle.importKey(
		"raw",
		encoder.encode(password),
		"PBKDF2",
		false,
		["deriveBits"],
	);
	const bits = await crypto.subtle.deriveBits(
		{ name: "PBKDF2", hash: HASH, salt: salt as BufferSource, iterations },
		key,
		KEY_LENGTH * 8,
	);
	return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const derived = await deriveKey(password, salt, ITERATIONS);
	return `${PREFIX}$${ITERATIONS}$${bytesToBase64Url(salt)}$${bytesToBase64Url(derived)}`;
}

export async function verifyPassword(
	password: string,
	stored: string,
): Promise<boolean> {
	const parts = stored.split("$");
	if (parts.length !== 4 || parts[0] !== PREFIX) {
		return false;
	}
	const iterations = Number(parts[1]);
	const salt = base64UrlToBytes(parts[2]);
	const expected = base64UrlToBytes(parts[3]);
	if (!Number.isInteger(iterations) || iterations <= 0) {
		return false;
	}
	const derived = await deriveKey(password, salt, iterations);
	if (derived.length !== expected.length) {
		return false;
	}
	let diff = 0;
	for (let i = 0; i < derived.length; i++) {
		diff |= derived[i] ^ expected[i];
	}
	return diff === 0;
}
