import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../app.js";
import { signAccessToken } from "../utils/jwt.js";

function listen(app) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0);
    server.once("listening", () => resolve(server));
    server.once("error", reject);
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

const token = signAccessToken({ sub: "usr_1", role: "freelancer" });

test("message routes reject callers without a bearer token", async () => {
  const server = await listen(createApp());
  const { port } = server.address();

  const anonymous = await fetch(`http://127.0.0.1:${port}/api/messages`);
  assert.equal(anonymous.status, 401);
  assert.deepEqual(await anonymous.json(), { success: false, message: "Unauthorized" });

  await close(server);
});

test("message routes reject a malformed bearer token", async () => {
  const server = await listen(createApp());
  const { port } = server.address();

  const response = await fetch(`http://127.0.0.1:${port}/api/messages`, {
    headers: { Authorization: "Bearer not-a-jwt" }
  });
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { success: false, message: "Invalid token" });

  await close(server);
});

test("message routes serve an authenticated caller", async () => {
  const server = await listen(createApp());
  const { port } = server.address();
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const before = (
    await (await fetch(`http://127.0.0.1:${port}/api/messages`, { headers })).json()
  ).data;

  const created = await fetch(`http://127.0.0.1:${port}/api/messages`, {
    method: "POST",
    headers,
    body: JSON.stringify({ jobId: "job_1", body: "I can start on Monday" })
  });
  assert.equal(created.status, 201);
  const createdPayload = await created.json();
  assert.equal(createdPayload.success, true);
  assert.equal(createdPayload.data.jobId, "job_1");

  const listed = await fetch(`http://127.0.0.1:${port}/api/messages`, { headers });
  assert.equal(listed.status, 200);
  const after = (await listed.json()).data;
  assert.equal(after.length, before.length + 1);

  await close(server);
});
