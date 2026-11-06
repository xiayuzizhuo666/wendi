import http from "node:http";
import { handler } from "../functions/handler.ts";

const port = Number(process.env.PORT || 8000);

const server = http.createServer(async (req, res) => {
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const method = req.method || "GET";
    const body = method === "GET" || method === "HEAD" ? undefined : Buffer.concat(chunks).toString("utf8");
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (Array.isArray(value)) headers.set(key, value.join(","));
      else if (value !== undefined) headers.set(key, value);
    }
    const request = new Request(`http://127.0.0.1:${port}${req.url || "/"}`, { method, headers, body });
    const response = await handler(request);
    res.statusCode = response.status;
    response.headers.forEach((value, key) => res.setHeader(key, value));
    if (!response.body) {
      res.end();
      return;
    }
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) res.write(Buffer.from(value));
    }
    res.end();
  } catch (error) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ ok: false, error: "local_function_error" }));
    console.error("local_function_error", error?.name);
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`wendi function listening on http://127.0.0.1:${port}`);
});
