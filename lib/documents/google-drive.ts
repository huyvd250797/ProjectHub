const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const FOLDER_MIME = "application/vnd.google-apps.folder";

type DriveFile = {
  id: string;
  name?: string;
  mimeType?: string;
  size?: string;
  md5Checksum?: string;
  webViewLink?: string;
  parents?: string[];
  trashed?: boolean;
  createdTime?: string;
  modifiedTime?: string;
  appProperties?: Record<string, string>;
};

let tokenCache: { token: string; expiresAt: number } | null = null;

function env(name: string) {
  return process.env[name]?.trim() ?? "";
}

export function googleDriveReady() {
  return Boolean(
    env("GOOGLE_DRIVE_CLIENT_ID") &&
      env("GOOGLE_DRIVE_CLIENT_SECRET") &&
      env("GOOGLE_DRIVE_REFRESH_TOKEN"),
  );
}

export class GoogleDriveError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 500, code = "GOOGLE_DRIVE_ERROR") {
    super(message);
    this.name = "GoogleDriveError";
    this.status = status;
    this.code = code;
  }
}

async function readGoogleError(response: Response) {
  const raw = await response.text();
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string }; error_description?: string };
    return parsed.error?.message || parsed.error_description || raw;
  } catch {
    return raw || response.statusText;
  }
}

export async function getGoogleAccessToken() {
  if (!googleDriveReady()) {
    throw new GoogleDriveError(
      "Google Drive chưa được cấu hình. Cần Client ID, Client Secret và Refresh Token.",
      503,
      "GOOGLE_DRIVE_NOT_CONFIGURED",
    );
  }
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.token;

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env("GOOGLE_DRIVE_CLIENT_ID"),
      client_secret: env("GOOGLE_DRIVE_CLIENT_SECRET"),
      refresh_token: env("GOOGLE_DRIVE_REFRESH_TOKEN"),
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new GoogleDriveError(
      `Không lấy được Google access token: ${await readGoogleError(response)}`,
      502,
      "GOOGLE_TOKEN_FAILED",
    );
  }
  const payload = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!payload.access_token) throw new GoogleDriveError("Google không trả về access token.", 502, "GOOGLE_TOKEN_EMPTY");
  tokenCache = {
    token: payload.access_token,
    expiresAt: Date.now() + Math.max(300, payload.expires_in ?? 3600) * 1000,
  };
  return tokenCache.token;
}

async function driveFetch(path: string, init: RequestInit = {}) {
  const token = await getGoogleAccessToken();
  const response = await fetch(`${DRIVE_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { "Content-Type": "application/json; charset=UTF-8" } : {}),
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new GoogleDriveError(
      `Google Drive API lỗi ${response.status}: ${await readGoogleError(response)}`,
      response.status === 404 ? 404 : 502,
      response.status === 404 ? "DRIVE_FILE_NOT_FOUND" : "DRIVE_REQUEST_FAILED",
    );
  }
  return response;
}

function escapeDriveQuery(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export async function getDriveFile(fileId: string, fields = "id,name,mimeType,size,md5Checksum,webViewLink,parents,trashed,createdTime,modifiedTime,appProperties") {
  const params = new URLSearchParams({ fields, supportsAllDrives: "true" });
  const response = await driveFetch(`/files/${encodeURIComponent(fileId)}?${params}`);
  return (await response.json()) as DriveFile;
}

export async function findDriveFolderByAppProperty(key: string, value: string, parentId?: string) {
  const clauses = [
    `mimeType='${FOLDER_MIME}'`,
    "trashed=false",
    `appProperties has { key='${escapeDriveQuery(key)}' and value='${escapeDriveQuery(value)}' }`,
  ];
  if (parentId) clauses.push(`'${escapeDriveQuery(parentId)}' in parents`);
  const params = new URLSearchParams({
    q: clauses.join(" and "),
    spaces: "drive",
    fields: "files(id,name,mimeType,parents,trashed)",
    pageSize: "10",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
  });
  const response = await driveFetch(`/files?${params}`);
  const payload = (await response.json()) as { files?: DriveFile[] };
  return payload.files?.[0] ?? null;
}

export async function createDriveFolder(name: string, appProperties: Record<string, string>, parentId?: string) {
  const params = new URLSearchParams({ fields: "id,name,mimeType,parents", supportsAllDrives: "true" });
  const response = await driveFetch(`/files?${params}`, {
    method: "POST",
    body: JSON.stringify({
      name,
      mimeType: FOLDER_MIME,
      appProperties,
      ...(parentId ? { parents: [parentId] } : {}),
    }),
  });
  return (await response.json()) as DriveFile;
}

export async function ensureDriveRootFolder() {
  const configured = env("GOOGLE_DRIVE_ROOT_FOLDER_ID");
  if (configured) {
    const folder = await getDriveFile(configured, "id,name,mimeType,parents,trashed");
    if (folder.mimeType !== FOLDER_MIME || folder.trashed) {
      throw new GoogleDriveError("GOOGLE_DRIVE_ROOT_FOLDER_ID không phải thư mục Drive hợp lệ.", 503, "DRIVE_ROOT_INVALID");
    }
    return folder.id;
  }

  const existing = await findDriveFolderByAppProperty("ascWorkingRoot", "v1");
  if (existing) return existing.id;
  const created = await createDriveFolder("ASC-WORKING", { ascWorkingRoot: "v1", managedBy: "ASC-WORKING" });
  return created.id;
}

export async function ensureDriveProjectFolder(projectId: string, projectCode: string, projectName: string) {
  const rootId = await ensureDriveRootFolder();
  const existing = await findDriveFolderByAppProperty("ascWorkingProjectId", projectId, rootId);
  if (existing) return existing.id;
  const safeCode = projectCode.replace(/[\\/:*?"<>|]/g, "-").trim() || "PROJECT";
  const safeName = projectName.replace(/[\\/:*?"<>|]/g, "-").trim();
  const created = await createDriveFolder(
    safeName ? `${safeCode} - ${safeName}` : safeCode,
    { ascWorkingProjectId: projectId, managedBy: "ASC-WORKING" },
    rootId,
  );
  return created.id;
}

export async function createResumableUploadSession(input: {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  folderId: string;
  projectId: string;
  sessionId: string;
}) {
  const token = await getGoogleAccessToken();
  const params = new URLSearchParams({
    uploadType: "resumable",
    supportsAllDrives: "true",
    fields: "id,name,mimeType,size,md5Checksum,webViewLink,parents,createdTime,modifiedTime",
  });
  const response = await fetch(`${DRIVE_UPLOAD_API}/files?${params}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": input.mimeType,
      "X-Upload-Content-Length": String(input.sizeBytes),
    },
    body: JSON.stringify({
      name: input.fileName,
      mimeType: input.mimeType,
      parents: [input.folderId],
      appProperties: {
        ascWorkingProjectId: input.projectId,
        ascWorkingUploadSessionId: input.sessionId,
        managedBy: "ASC-WORKING",
      },
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new GoogleDriveError(
      `Không khởi tạo được phiên upload: ${await readGoogleError(response)}`,
      502,
      "DRIVE_UPLOAD_SESSION_FAILED",
    );
  }
  const uploadUrl = response.headers.get("location");
  if (!uploadUrl) throw new GoogleDriveError("Google Drive không trả về resumable session URL.", 502, "DRIVE_UPLOAD_URL_EMPTY");
  return uploadUrl;
}

export async function updateDriveFileMetadata(fileId: string, payload: { name?: string; trashed?: boolean }) {
  const params = new URLSearchParams({ fields: "id,name,trashed,modifiedTime", supportsAllDrives: "true" });
  const response = await driveFetch(`/files/${encodeURIComponent(fileId)}?${params}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return (await response.json()) as DriveFile;
}

export async function fetchDriveFileContent(fileId: string, range?: string | null) {
  const token = await getGoogleAccessToken();
  const params = new URLSearchParams({ alt: "media", supportsAllDrives: "true" });
  return fetch(`${DRIVE_API}/files/${encodeURIComponent(fileId)}?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      ...(range ? { Range: range } : {}),
    },
    cache: "no-store",
  });
}
