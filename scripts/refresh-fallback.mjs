import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..");
const FB_PATH = join(PROJECT_ROOT, "src", "lib", "data", "market-heatmap-fallback.json");

// Akile proxy (HK egress) — eastmoney allows this egress; Vercel egress is blocked.
const PROXY = process.env.EASTMONEY_PROXY || "http://127.0.0.1:7893";
const UT = "bd1d9ddb04089700cf9c27f6f7426281";

function toSecid(code) {
  const m = code.match(/\.(SH|SZ|BJ)$/i);
  const exch = (m ? m[1] : "SZ").toUpperCase();
  const pure = code.replace(/\.(SH|SZ|BJ)$/i, "");
  const prefix = exch === "SH" ? "1" : "0";
  return `${prefix}.${pure}`;
}

function fetchEastmoneyPage(secids) {
  const url =
    `https://push2delay.eastmoney.com/api/qt/ulist.np/get?ut=${UT}` +
    `&fltt=2&invt=2&fields=f12,f14,f2,f3&secids=${secids.join(",")}`;
  const raw = execSync(
    `curl -s --proxy "${PROXY}" --connect-timeout 15 --max-time 45 "${url}"`,
    { encoding: "utf8" }
  );
  const json = JSON.parse(raw);
  if (json.rc !== 0 || !json.data?.diff) {
    throw new Error("Eastmoney returned invalid payload: " + raw.slice(0, 200));
  }
  return json.data.diff;
}

function fetchEastmoney() {
  const fb = JSON.parse(readFileSync(FB_PATH, "utf8"));
  const secids = fb.stocks.map((s) => toSecid(s.code));
  const all = [];
  for (let i = 0; i < secids.length; i += 500) {
    const batch = secids.slice(i, i + 500);
    const diff = fetchEastmoneyPage(batch);
    const list = Array.isArray(diff) ? diff : Object.values(diff || {});
    all.push(...list);
    process.stdout.write(`[refresh] fetched ${all.length}/${secids.length}\r`);
  }
  return all;
}

const diff = fetchEastmoney();
const map = new Map();
for (const it of diff) {
  const code = String(it.f12);
  const price = Number(it.f2);
  const changePct = Number(it.f3);
  if (!code || !Number.isFinite(price) || !Number.isFinite(changePct)) continue;
  map.set(code, { price, changePct });
}
console.log(`\n[refresh] fetched ${diff.length} quotes, ${map.size} valid from eastmoney`);

const fb = JSON.parse(readFileSync(FB_PATH, "utf8"));
let updated = 0;
let skipped = 0;
for (const s of fb.stocks) {
  const pure = String(s.code).replace(/\.(SH|SZ|BJ)$/i, "");
  const q = map.get(pure);
  if (q) {
    s.price = q.price;
    s.changePct = q.changePct;
    updated++;
  } else {
    skipped++;
  }
}
fb.updatedAt = new Date().toISOString();
writeFileSync(FB_PATH, JSON.stringify(fb));
console.log(
  `[refresh] updated ${updated} stocks, skipped ${skipped}; new updatedAt=${fb.updatedAt}`
);
