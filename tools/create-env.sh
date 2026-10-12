#!/usr/bin/env bash
# ============================================================
#  create-env.sh —— 充值后一键建环境
# ------------------------------------------------------------
#  背景：当前环境 memorize-d2gzl4arhfc2dd925 是 PostgreSQL 模式，
#  不支持文档型数据库，且该属性创建后无法切换，只能新建环境。
#
#  ⚠️ 建环境会实际扣费（个人版 ¥19.9/月），本脚本会在执行前二次确认。
#
#  前置条件：腾讯云账户余额充足（充值可用微信支付）
#    https://console.cloud.tencent.com/expense/recharge
#
#  用法：
#    bash tools/create-env.sh                    # 交互确认后创建
#    bash tools/create-env.sh --yes              # 跳过确认（谨慎）
# ============================================================

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NODE_BIN="${NODE_BIN:-$(ls -d /c/Users/Honor/.workbuddy/binaries/node/versions/*/ 2>/dev/null | grep -v "\." | sort -V | tail -1)node.exe}"
TCB_JS="${TCB_JS:-C:/Users/Honor/.workbuddy/binaries/node/workspace/node_modules/@cloudbase/cli/bin/tcb}"

ALIAS="memorize-doc"
PKG="baas_personal"
REGION="ap-shanghai"

tcb() {
  (cd "$ROOT" && env -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy \
    "$NODE_BIN" "$TCB_JS" "$@")
}

echo "========================================"
echo " 创建云环境（云数据库模式）"
echo "========================================"
echo " 别名：$ALIAS"
echo " 套餐：个人版 ¥19.9/月（原价 ¥39.9）"
echo " 地域：上海"
echo " 数据库：云数据库（文档型可用）"
echo ""

# ── 前置检查 1：登录 ──
echo "[1/4] 检查登录状态"
if ! tcb login 2>&1 | grep -q "logged in"; then
  echo "  ✗ 未登录，请先运行：tcb login"
  exit 1
fi
echo "  ✓ 已登录"

# ── 前置检查 2：余额 ──
echo "[2/4] 检查账户余额"
BAL=$(tcb env usage 2>&1 | grep -oE "[0-9.]+ used / [0-9.]+ total" | head -1 || true)
if [ -n "$BAL" ]; then
  echo "  当前环境资源点：$BAL"
fi

# 打印当前 CLI 登录的账号 UIN —— 充值必须充到这个账号
UIN=$(node -e "
const fs=require('fs');
try {
  const d=JSON.parse(fs.readFileSync(process.env.USERPROFILE+'/.config/.cloudbase/auth.json','utf8'));
  console.log((d.credential&&d.credential.uin)||'');
} catch(e){}
" 2>/dev/null || true)
if [ -n "$UIN" ]; then
  echo "  当前登录账号 UIN：$UIN"
  echo "  ⚠ 充值必须充到这个 UIN 对应的腾讯云账号，否则 CLI 依然报余额不足"
fi
echo "  充值页（支持微信支付，实时到账）："
echo "    https://console.cloud.tencent.com/expense/recharge"
echo ""

# ── 前置检查 3：环境数量 ──
echo "[3/4] 检查环境数量"
# 不能靠数表格行：CLI 输出带 ANSI 颜色码，且表头也含 CloudBase 字样。
# 改成数「行首出现 envId」—— CloudBase 的 envId 必然含 memorize- 或 env- 前缀。
CNT=$(tcb env list 2>&1 | grep -cE "(memorize|env)-[a-z0-9]{6,}" || true)
echo "  现有环境数：$CNT 个（上限 50，够用）"

# ── 确认 ──
echo ""
if [ "${1:-}" != "--yes" ]; then
  echo "⚠️  接下来会实际扣费 ¥19.9"
  echo ""
  read -r -p "确认创建？输入 yes 继续：" ans
  if [ "$ans" != "yes" ]; then
    echo "已取消。"
    exit 0
  fi
fi

# ── 创建 ──
echo ""
echo "[4/4] 创建环境（可能要等 1-3 分钟）"
OUT=$(tcb env create --alias "$ALIAS" --package "$PKG" --region "$REGION" --duration 1 --yes 2>&1)
echo "$OUT"

if echo "$OUT" | grep -qi "Insufficient account balance"; then
  echo ""
  echo "========================================"
  echo " ✗ 余额不足"
  echo "========================================"
  echo " 充值（支持微信支付，实时到账）："
  echo " https://console.cloud.tencent.com/expense/recharge"
  echo ""
  echo " 充完再跑一次本脚本即可。"
  exit 1
fi

if ! echo "$OUT" | grep -qiE "success|成功|created"; then
  echo ""
  echo "  未看到成功标记，请核对：tcb env list"
  exit 1
fi

echo ""
echo "========================================"
echo " ✓ 创建成功"
echo "========================================"
echo ""
echo " 接下来我需要新环境的 envId。查一下："
echo "   node tools/ready.js          # 体检第一项会显示环境列表"
echo "   或直接：tcb env list"
echo ""
echo " 拿到 envId 后跑："
echo "   bash tools/switch-env.sh <新envId>"
echo "   bash tools/deploy.sh"
echo "   node database/bootstrap-db.js"
echo "========================================"
