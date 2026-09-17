// Mock Zhihu openapi server for local E2E of the OAuth flow (test seam:
// frontend reads ZHIHU_OAUTH_BASE_URL). Not part of the app; lives outside
// the repo working tree.
const http = require("http");

// int64 that loses precision through JS Number (969570047710216193 -> ...200),
// used to verify lossless uid extraction on the app side.
const UID = "969570047710216193";

http
  .createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1:3999");
    if (req.method === "POST" && url.pathname === "/access_token") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        const p = new URLSearchParams(body);
        console.log("[mock] token exchange:", JSON.stringify(Object.fromEntries(p)));
        const bad =
          p.get("grant_type") !== "authorization_code" ||
          !p.get("app_id") || !p.get("app_key") || !p.get("redirect_uri") || !p.get("code");
        res.writeHead(bad ? 400 : 200, { "Content-Type": "application/json" });
        res.end(
          bad
            ? JSON.stringify({ code: 40001, message: "invalid params" })
            : JSON.stringify({ access_token: "mock-token-" + p.get("code"), token_type: "Bearer", expires_in: 3600 }),
        );
      });
      return;
    }
    if (req.method === "GET" && url.pathname === "/user") {
      const auth = req.headers.authorization || "";
      console.log("[mock] /user auth:", auth.slice(0, 24));
      if (!auth.startsWith("Bearer mock-token-")) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ code: 40100, message: "unauthorized" }));
        return;
      }
      // raw write so the uid stays an exact int64 literal on the wire
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        '{"uid":' + UID + ',"hash_id":"mockhash001","fullname":"知乎测试用户","gender":"male",' +
        '"headline":"mock headline","description":"","avatar_path":"https://picx.zhimg.com/mock.jpg",' +
        '"url":"https://openapi.zhihu.com/users/' + UID + '","email":"","phone_no":"","phone":""}',
      );
      return;
    }
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end("{}");
  })
  .listen(3999, "127.0.0.1", () => console.log("[mock] zhihu mock listening on 127.0.0.1:3999"));
