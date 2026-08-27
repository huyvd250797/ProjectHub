import http from "node:http";
import crypto from "node:crypto";
import process from "node:process";

const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID?.trim();
const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET?.trim();
const port = Number(process.env.GOOGLE_DRIVE_OAUTH_PORT || 53682);
const redirectUri = `http://127.0.0.1:${port}/oauth/callback`;
const scope = "https://www.googleapis.com/auth/drive.file";

if (!clientId || !clientSecret) {
  console.error("Thiếu GOOGLE_DRIVE_CLIENT_ID hoặc GOOGLE_DRIVE_CLIENT_SECRET trong shell hiện tại.");
  console.error("Hãy export hai biến này rồi chạy lại: npm run drive:oauth");
  process.exit(1);
}

const state = crypto.randomBytes(24).toString("base64url");
const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
authUrl.search = new URLSearchParams({
  client_id: clientId,
  redirect_uri: redirectUri,
  response_type: "code",
  scope,
  access_type: "offline",
  prompt: "consent",
  include_granted_scopes: "true",
  state,
}).toString();

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || "/", redirectUri);
  if (url.pathname !== "/oauth/callback") {
    response.writeHead(404).end("Not found");
    return;
  }
  if (url.searchParams.get("state") !== state) {
    response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" }).end("OAuth state không hợp lệ.");
    return;
  }
  const code = url.searchParams.get("code");
  if (!code) {
    response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" }).end(`Google OAuth lỗi: ${url.searchParams.get("error") || "missing code"}`);
    return;
  }

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const payload = await tokenResponse.json();
    if (!tokenResponse.ok || !payload.refresh_token) {
      throw new Error(payload.error_description || payload.error || "Google không trả về refresh token. Hãy thu hồi quyền cũ và chạy lại với prompt=consent.");
    }
    response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" }).end("Đã cấp quyền Google Drive. Có thể đóng tab này và quay lại Terminal.");
    console.log("\nThành công. Sao chép giá trị sau vào môi trường server/Vercel; không commit vào Git:\n");
    console.log(`GOOGLE_DRIVE_REFRESH_TOKEN=${payload.refresh_token}`);
    console.log("\nScript sẽ tự thoát. Client secret và refresh token không được ghi vào file.");
    setTimeout(() => server.close(), 250);
  } catch (error) {
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" }).end("Không đổi được authorization code. Xem Terminal để biết chi tiết.");
    console.error(error instanceof Error ? error.message : error);
    setTimeout(() => server.close(), 250);
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`\n1. Trong Google Cloud OAuth client, thêm Redirect URI chính xác:\n   ${redirectUri}`);
  console.log("\n2. Mở URL sau trong trình duyệt và đăng nhập tài khoản Google Drive lưu tài liệu:\n");
  console.log(authUrl.toString());
  console.log("\nĐang chờ callback OAuth...");
});
