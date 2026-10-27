import { test } from "node:test";
import assert from "node:assert/strict";
import { formatDate } from "../src/lib/domain";
const base = process.env.BASE_URL || "http://127.0.0.1:3000";
async function start() {
  const response = await fetch(`${base}/api/workspace`);
  assert.equal(response.status,200);
  const cookie = response.headers.get("set-cookie")!.split(";")[0];
  return { cookie, data: await response.json() };
}
function post(cookie: string, body: unknown, headers: Record<string,string> = {}) {
  return fetch(`${base}/api/workspace`, { method:"POST", headers:{"Content-Type":"application/json", "Origin":base, "X-LabTrack-Request":"1", "Cookie":cookie, ...headers}, body:JSON.stringify(body) });
}
test("API: dates round-trip, stale edits conflict, invalid dates and cross-origin writes fail", async () => {
  const { cookie, data } = await start();
  const c = data.cases[0];
  const response = await post(cookie,{action:"due-date",caseId:c.id,dueDate:"2028-02-29",version:c.version});
  assert.equal(response.status,200);
  assert.equal((await response.json()).cases.find((item: {id:string}) => item.id === c.id).due_date,"2028-02-29");
  assert.equal((await post(cookie,{action:"due-date",caseId:c.id,dueDate:"2028-03-01",version:c.version})).status,409);
  assert.equal((await post(cookie,{action:"due-date",caseId:c.id,dueDate:"2026-02-29",version:2})).status,400);
  assert.equal((await post(cookie,{action:"ready",caseId:c.id},{Origin:"https://attacker.example"})).status,403);
  assert.equal((await post(cookie,{action:"ready",caseId:"LT-9999"})).status,404);
});
test("API: concurrent ready requests capture exactly one message and refresh persists it", async () => {
  const {cookie,data} = await start(); const id=data.cases[1].id;
  const results=await Promise.all(Array.from({length:5},()=>post(cookie,{action:"ready",caseId:id})));
  results.forEach(r=>assert.equal(r.status,200));
  const body=await (await fetch(`${base}/api/workspace`,{headers:{Cookie:cookie}})).json();
  assert.equal(body.messages.length,1);
  assert.equal(body.messages[0].status,"captured");
  assert.equal(body.messages[0].attempts,1);
  assert.equal(body.cases.find((c:{id:string})=>c.id===id).status,"ready");
  assert.match(body.messages[0].body,/Your ceramic bridge case LT-2042 is ready/);
  assert.ok(body.messages[0].body.includes(formatDate(data.cases[1].due_date,"long")));
  assert.ok(!body.messages[0].body.includes(data.cases[1].reference));
});
test("API: failure preserves ready status and retry recovers the same event", async()=>{
  const {cookie,data}=await start();const id=data.cases[0].id;
  const failed=await (await post(cookie,{action:"ready",caseId:id,simulateFailure:true})).json();
  assert.equal(failed.messages[0].status,"failed");
  assert.equal(failed.cases.find((c:{id:string})=>c.id===id).status,"ready");
  const recovered=await (await post(cookie,{action:"retry",caseId:id})).json();
  assert.equal(recovered.messages[0].id,failed.messages[0].id);
  assert.equal(recovered.messages[0].status,"captured");
  assert.equal(recovered.messages[0].attempts,2);
  const repeated=await(await post(cookie,{action:"retry",caseId:id})).json();
  assert.equal(repeated.messages[0].attempts,2);
});
test("API: visitors have isolated fictional workspaces",async()=>{
  const first=await start();const second=await start();
  assert.notEqual(first.cookie,second.cookie);
  assert.equal((await post(first.cookie,{action:"ready",caseId:first.data.cases[0].id})).status,200);
  const other=await(await fetch(`${base}/api/workspace`,{headers:{Cookie:second.cookie}})).json();
  assert.equal(other.messages.length,0);assert.equal(other.cases[0].status,"quality_check");
});
