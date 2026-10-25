import { readFileSync } from "node:fs";

const vars = {};
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const match = /^([A-Z0-9_]+)="?([^"]*)"?$/.exec(line.trim());
  if (match) vars[match[1]] = match[2];
}

const url = "https://ecclesia-oesckuqub-elite-sistemas.vercel.app/api/cron/backup";
const response = await fetch(url, {
  headers: { authorization: `Bearer ${vars.CRON_SECRET}` },
});
const body = await response.text();
console.log(JSON.stringify({ status: response.status, body: body.slice(0, 1500) }, null, 2));
