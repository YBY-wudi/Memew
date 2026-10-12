/**
 * 通过 CloudBase HTTP API 调用云函数（诊断用）。
 *
 * ============================================================================
 * ⚠️⚠️ 实测结论（2026-10-06）：**服务端 API Key 只能部署，不能调用云函数**
 * ============================================================================
 * 用这个环境 API Key 实测三轮，结论如下 —— 别再猜了：
 *
 *   | 操作| 结果 |
 *   |---|---|
 *   | `env list` | ✅ 能看到环境 |
 *   | `fn list` | ✅ 8 个函数全列得出 |
 *   | `fn deploy` | ✅ **部署成功**（更新时间确实变了） |
 *   | `fn invoke` | ❌ `[Invoke] Cam authentication failed` |
 *   | POST `/web` + Authorization: Bearer | ❌ `INVALID_ACCESS_TOKEN`
 *     （`access token env not consistency`）|
 *   | POST `/web` + `env` 字段 | ❌ `INVALID_APP_SIGN: jwt must be provided` |
 *
 * 原因：API Key 的 JWT 里 `aud` / `project_id` 都绑定到 `envId`，
 * 但网关调用要求 **「请求里的 env」与「token 的 aud」严格一致**，
 * 而部署走的是另一条鉴权链路，所以部署能通、调用不通。
 *
 * 👉 **所以：调云函数验证请在小程序里做**（「我的 → 云函数自检」），
 *    那里用的是小程序自己的登录态，不依赖 API Key。
 *
 * 本脚本保留作为**探测网关鉴权行为**的工具（换 Key / 换环境时可复测），
 * 但**不作为日常验证手段** —— 免得下次又有人以为「调用失败 = 环境坏了」。
 *
 * ============================================================================
 * 参考：服务端 API Key 的官方用法是
 *   curl -X POST https://tcb-api.tencentcloudapi.com/web \
 *     -H 'Content-Type: application/json' -H 'Authorization: Bearer <KEY>' \
 *     -d '{"action":"functions.invoke","function_name":"test","request_data":{}}'
 * 但如上实测，该路径在当前环境返回 INVALID_ACCESS_TOKEN。
 * ============================================================================
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const KEY_FILE = path.join(ROOT, '.cloudbase-key.local.json');
const rc = JSON.parse(fs.readFileSync(path.join(ROOT, 'cloudbaserc.json'), 'utf8'));
const ENV_ID = rc.envId;

const name = process.argv[2];
if (!name) {
  console.error('用法：node tools/call-fn.js <函数名> [JSON 参数]');
  process.exit(1);
}

if (!fs.existsSync(KEY_FILE)) {
  console.error('✗ 没找到 .cloudbase-key.local.json，先跑 tools/login-with-key.js');
  process.exit(1);
}
const apiKey = JSON.parse(fs.readFileSync(KEY_FILE, 'utf8')).apiKey;

let data = {};
const raw = process.argv[3];
if (raw) {
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error('✗ 参数不是合法 JSON：' + e.message);
    process.exit(1);
  }
}

const body = JSON.stringify({
  action: 'functions.invoke',
  env_id: ENV_ID,
  function_name: name,
  request_data: data
});

console.log('调用 ' + name + ' @ ' + ENV_ID);
console.log('参数 ' + JSON.stringify(data));
console.log('');

const req = https.request(
  {
    host: 'tcb-api.tencentcloudapi.com',
    path: '/web',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      // ⚠️ 服务端 API Key 用这个头；X-CloudBase-Authorization 是前端 SDK 用的
      Authorization: 'Bearer ' + apiKey
    }
  },
  (res) => {
    let d = '';
    res.on('data', (c) => (d += c));
    res.on('end', () => {
      console.log('HTTP ' + res.statusCode);
      try {
        const j = JSON.parse(d);
        // 网关会把云函数返回值包在 data 字段里
        const payload = j && j.data !== undefined ? j.data : j;
        console.log(JSON.stringify(payload, null, 2).slice(0, 4000));
      } catch (e) {
        console.log(d.slice(0, 2000));
      }
    });
  }
);
req.on('error', (e) => console.log('请求失败: ' + e.message));
req.setTimeout(180000, () => { req.destroy(); console.log('超时 180s'); });
req.write(body);
req.end();