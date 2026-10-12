#!/usr/bin/env node
/**
 * 新环境一键初始化（换环境后跑这一个就够）
 * ------------------------------------------------------------
 * 为什么要有这个脚本：
 * 换环境不是一步，是五步（改配置 / 建集合 / 导目录 / 导正文 / 部署函数），
 * 每步都要手动敲命令，漏一步就是「有的功能好、有的功能报集合不存在」，
 * 极难定位。2026-10-06用户已经被环境问题耗掉了耐心，这里把五步串成一条。
 *
 * 用法：
 *   node tools/bootstrap-new-env.js <新环境ID>
 *
 * 它会依次做：
 *   1. 同步 7 处环境 ID 配置
 *   2. 建 12 个集合
 *   3. 导 49 本教材目录
 *   4. 导 7 本自编正文
 *   5. 部署 8 个云函数
 *   6. 体检（tools/ready.js）
 *
 * 每步独立报错并继续 —— 某步失败不会挡住后面的，最后统一汇总。
 * 幂等：重复跑安全。
 */
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const newEnv = process.argv[2];

if (!newEnv) {
  console.error('\n用法：node tools/bootstrap-new-env.js <新环境ID>\n');
  process.exit(1);
}

const NODE = process.execPath;
const results = [];

function run(label, cmd, args, opts = {}) {
  process.stdout.write(`\n${'='.repeat(52)}\n▶ ${label}\n${'='.repeat(52)}\n`);
  const r = spawnSync(cmd, args, {
    cwd: opts.cwd || ROOT,
    encoding: 'utf8',
    timeout: opts.timeout || 900000,
    stdio: 'inherit',
    shell: false,
    env: Object.assign({}, process.env, {
      ENV_ID: newEnv,
      // ⚠️ 必须清代理：本机 HTTP_PROXY 会让CLI 上传代码失败
      //     （upstream connect failed / os error 11001）
      HTTP_PROXY: '', HTTPS_PROXY: '', http_proxy: '', https_proxy: '',
      NO_PROXY: '*', no_proxy: '*'
    })
  });
  const ok = r.status === 0;
  results.push({ label, ok, code: r.status });
  return ok;
}

console.log(`\n新环境：${newEnv}`);
console.log('接下来 6 步全自动，中途某步失败不影响后面的，最后会汇总。\n');

// 1. 配置
run('1/6 同步 7 处环境 ID 配置', NODE, [path.join(ROOT, 'tools', 'switch-env.js'), newEnv], {
  timeout: 60000
});

// 2~4 数据库
run('2/6 建 12 个集合 + 导 49 本目录教材', NODE, [path.join(ROOT, 'database', 'init-cloud.js')]);
run('3/6 导 7 本自编教材正文', NODE, [path.join(ROOT, 'database', 'upload-content.js')]);

// 5. 部署云函数（走 deploy.sh，它有 8 个已验证的坑的注释）
if (process.platform === 'win32') {
  const sh = path.join(ROOT, 'tools', 'deploy.sh');
  run('4/6 部署 8 个云函数（bash deploy.sh）', 'bash', [sh]);
} else {
  run('4/6 部署 8 个云函数', 'bash', [path.join(ROOT, 'tools', 'deploy.sh')]);
}

// 6. 体检
run('5/6 环境体检', NODE, [path.join(ROOT, 'tools', 'ready.js')], { timeout: 180000 });

// ---- 汇总
console.log(`\n\n${'='.repeat(52)}\n汇总\n${'='.repeat(52)}\n`);
let bad = 0;
results.forEach((r) => {
  console.log(`  ${r.ok ? '✓' : '✗'} ${r.label}${r.ok ? '' : `  (exit ${r.code})`}`);
  if (!r.ok) bad++;
});

console.log('');
if (bad === 0) {
  console.log('全部成功。最后一步（必须你手动做）：');
  console.log('  1. 微信开发者工具点「编译」');
  console.log('  2. 顶部环境选择器确认切到 ' + newEnv);
  console.log('  3. 真机 → 我的 → 云函数自检 → 一键测试');
} else {
  console.log(`${bad} 步失败。看上面的输出定位；也可以单独重跑某一步：`);
  console.log(`  ENV_ID=${newEnv} node database/init-cloud.js`);
  console.log(`  bash tools/deploy.sh`);
  console.log(`  ENV_ID=${newEnv} node tools/ready.js`);
}
console.log('');
process.exit(0);