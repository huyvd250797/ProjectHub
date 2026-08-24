import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const VERSION = "v1";

function getKey() {
  const raw = process.env.APP_ENCRYPTION_KEY;
  if (!raw || raw.trim().length < 24) {
    throw new Error("APP_ENCRYPTION_KEY_MISSING");
  }
  return createHash("sha256").update(raw, "utf8").digest();
}

function aad(projectId: string, resourceId: string) {
  return Buffer.from(`${projectId}:${resourceId}`, "utf8");
}

export function encryptResourceSecret(secret: string, projectId: string, resourceId: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  cipher.setAAD(aad(projectId, resourceId));
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64"), tag.toString("base64"), ciphertext.toString("base64")].join(":");
}

export function decryptResourceSecret(payload: string, projectId: string, resourceId: string) {
  const [version, ivB64, tagB64, cipherB64] = payload.split(":");
  if (version !== VERSION || !ivB64 || !tagB64 || !cipherB64) throw new Error("SECRET_FORMAT_INVALID");
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAAD(aad(projectId, resourceId));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(cipherB64, "base64")), decipher.final()]).toString("utf8");
}

export function secretHint(secret: string) {
  if (!secret) return null;
  if (secret.length <= 4) return "••••";
  return `••••${secret.slice(-4)}`;
}
