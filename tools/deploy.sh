#!/usr/bin/env bash
# ============================================================
#  咪猫爱背诵 · 云函数一键部署（腾讯云官方 CloudBase CLI）
# ------------------------------------------------------------
#  为什么不用微信开发者工具的 CLI？
#    实测开发者工具 CLI 的 `cloud env list` / `cloud functions`
#    均返回 ret 1000 system error（服务端查询环境失败），
#    而官方 @cloudbase/cli 可以正常列出环境与部署。
#
#  ⚠️ 必须知道的坑（都实际踩过）：
#    1. 必须加 --force。函数已存在时 CLI 会问"overwrite? (y/N)" 并等待输入，
#       非交互环境下没有输入就卡死，表现为「函数状态异常 / Creation failed」。
#    2. 不能调 node_modules/.bin/tcb（那是 shell 包装脚本），
#       Git Bash 会当 JS 解析报 missing )。要直接调 bin/tcb。
#    3. 区域要显式指定 --region ap-shanghai，否则可能查到别的区域去。
#    4. 必须清掉代理变量。本机设了 HTTP_PROXY=127.0.0.1:60188，
#       CLI 上传代码时会走代理，代理转发的域名解析不了，
#       报「upstream connect failed / os error 11001 或 10051」。
#    5. 执行目录必须是项目根、--dir 必须给相对路径。
#       给 /d/... 这类 MSYS 绝对路径，Windows 版 node 读不到，
#       CLI 找不到代码目录，会报 network_error 并在云端留下
#       「Creation failed」的半成品函数。
#    6. 成功判定要认英文。CLI 3.8.5 输出的是
#       "Cloud function deployed successfully!"，不是中文「部署成功」。
#    7. 不能用 `tcb env list` 判断环境是否存在（详见下方 [1/3] 注释）。
#    8. 命令要接 `yes |`。函数没在 cloudbaserc.json 的 functions[] 里注册时，
#       CLI 会问「Continue deployment with the default configuration? (y/N)」
#       然后**无限等待 stdin** —— 非交互环境里就表现为「跑几小时不出结果」，
#       进程还在但 CPU 为 0。share 函数实测卡了 3 小时。
#       根治办法是新增函数后在 cloudbaserc.json 注册，`yes |` 只是保险。
#
#  前置条件：
#    1. 首次使用先登录：npx tcb login（微信扫码）
#    2. 已在云开发控制台建好 12 个数据库集合（见文末）
#
#  用法：
#    bash tools/deploy.sh
#    ENV_ID=你的环境ID bash tools/deploy.sh
#    ONLY=review,aiService bash tools/deploy.sh    # 只部署部分函数
#
#  ⏱ 每个函数约需 2-3 分钟（要等云端装依赖），7 个约 20 分钟。
#     建议后台跑：bash tools/deploy.sh > /tmp/deploy.log 2>&1
# ============================================================

set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# ⚠ ENV_ID 必须从 miniprogram/utils/env.js 读，不能写死。
#   写死过一次，导致换环境后 deploy.sh 默默部署到旧环境，
#   而输出全是 ✅，看起来成功、实际新环境一个函数都没有。
#   读取失败就退出，宁可不部署也不要部署错地方。
#
#   注意：$ROOT 在 Git Bash 下是 /d/... 形式，node 读不到，
#   所以先 cd 过去再用相对路径读。
if [ -z "${ENV_ID:-}" ]; then
  ENV_ID=$(cd "$ROOT" && node -e "
    try {
      const s = require('fs').readFileSync('miniprogram/utils/env.js','utf8');
      const m = s.match(/ENV_ID\s*=\s*'([^']+)'/);
      if (m) console.log(m[1]);
    } catch(e){}
  " 2>/dev/null | tr -d '\r')
fi
if [ -z "$ENV_ID" ]; then
  echo "[错误] 读不到 ENV_ID"
  echo "  请检查 miniprogram/utils/env.js 里的 ENV_ID，"
  echo "  或手动指定：ENV_ID=你的环境ID bash tools/deploy.sh"
  exit 1
fi
REGION="${REGION:-ap-shanghai}"
FUNCS="${ONLY:-login review library medal upload aiService admin share}"

NODE_BIN="$(ls -d /c/Users/Honor/.workbuddy/binaries/node/versions/*/ 2>/dev/null | grep -v "\." | sort -V | tail -1)node.exe"
TCB_WS="C:/Users/Honor/.workbuddy/binaries/node/workspace"

echo "========================================"
echo " 咪猫爱背诵 · 云函数部署"
echo "========================================"
echo "项目路径：$ROOT"
echo "云环境　：$ENV_ID"
echo "地域　　：$REGION"
echo "待部署　：$FUNCS"
echo ""

# ---------- 0. 环境准备 ----------
if [ ! -d "$TCB_WS/node_modules/@cloudbase/cli" ]; then
  echo "[0/3] 安装 @cloudbase/cli ..."
  mkdir -p "$TCB_WS"
  (cd "$TCB_WS" && "$NODE_BIN" "$(dirname "$NODE_BIN")/npm.cmd" install @cloudbase/cli 2>&1 | tail -3)
  echo ""
fi

tcb() {
  # 调bin/tcb 而不是 node_modules/.bin/tcb
  #   后者是 shell 包装脚本，Git Bash 下会报 missing ) after argument list
  #
  # 清掉代理变量：见文件头「坑4」，走代理会导致上传失败
  #
  # ⚠ cwd 必须是项目根、--dir 必须给相对路径。
  #   之前这里 cd "$TCB_WS"（node workspace）并传 /d/... 绝对路径，
  #   Windows 版 node 解析不了这种MSYS 路径，于是
  #   CLI 找不到代码目录 → 报 network_error → 云端留下
  #   「Creation failed」的半成品函数。
  #   同一份代码手动在项目根用相对路径跑，一次就成功。
  #
  #   CLI 通过 npm 装在 TCB_WS，但用绝对 Windows 路径调用它的入口文件，
  #   执行目录则由 cwd 决定，两者互不冲突。
  (cd "$ROOT" && env -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy \
    "$NODE_BIN" "$TCB_WS/node_modules/@cloudbase/cli/bin/tcb" "$@")
}

# ---------- 1. 登录检查 ----------
echo "[1/3] 检查登录与环境..."
# ⚠ 不要用 `tcb env list` 判断环境是否存在。
#   实测新环境 memorize-doc-d2gh5ik8bcab74976 能正常调用
#   （fn list 返回空表格、db execute 打到真实引擎报参数格式错），
#   但 `tcb env list` 里查不到它。同一时刻旧环境显示 ISOLATE。
#   推测 env list 走的是另一套套餐/授权维度的查询，与实际可调用性不一致。
#
#   `tcb fn list` 才是可靠探针：
#     环境存在但没函数 → 打印空表格 + "List data is empty"
#     环境不存在     → 报 "This may be region-related" 并附多区域排查指引
#   两者文本完全不同，可以稳定区分。
PROBE=$(tcb fn list --env-id "$ENV_ID" --region "$REGION" 2>&1)
# ⚠ 判据：用「有没有表格」而不是「有没有坏字符」。
#   CLI 报错时不打印表格，只有一堆提示文字；
#   成功时（哪怕 0 个函数）也会打印带 ┌─┬─┐ 的表头。
#   踩过一次用正则挑错误关键词，结果正则里的 login
#   命中了表格里名为 login 的函数行，正常环境被判成不可访问。
#   改成看表格骨架，函数名叫什么都不会影响判断。
if ! echo "$PROBE" | grep -q "Function Id"; then
  echo "      [错误] 环境不可访问，输出如下："
  echo "$PROBE" | sed 's/^/        /' | head -12
  echo ""
  echo "      排查："
  echo "        1. 是否已登录：cd $ROOT && $NODE_BIN $TCB_WS/node_modules/@cloudbase/cli/bin/tcb login"
  echo "           （微信扫码，登录态约2 小时有效）"
  echo "        2. ENV_ID 是否正确（当前：$ENV_ID）"
  echo "        3. 当前微信号是否有该环境的权限"
  exit 1
fi
echo "      ✅ 环境 $ENV_ID 可访问"
echo ""

# ---------- 2. 同步公共模块 ----------
echo "[2/3] 同步云函数公共模块..."
node "$ROOT/cloudfunctions/sync-shared.js" 2>&1 | sed 's/^/      /'
echo ""

# ---------- 3. 逐个部署 ----------
echo "[3/3] 部署云函数（云端安装依赖）..."
echo ""
FAILED=""
DEPLOYED=""
SKIPPED=""
#⚠ 分隔符两种都要支持：逗号和空格。
#   之前只按空白分词（for fn in $FUNCS），而文件头注释里
#   写的用法示例是逗号分隔（ONLY=review,aiService）——
#   照着注释敲命令，整串「review,aiService」被当成**一个目录名**，
#   8 个函数全部「目录不存在，跳过」，脚本却照样打印
#   「✅ 全部部署完成」。7 秒返回、一个函数没传，非常有欺骗性。
SKIPPED_LIST=""
for fn in $(echo "$FUNCS" | tr ',' ' '); do
  DIR="$ROOT/cloudfunctions/$fn"
  if [ ! -d "$DIR" ]; then
    echo "      ⚠️  $fn 目录不存在，跳过"
    SKIPPED="${SKIPPED} $fn"
    continue
  fi
  DEPLOYED="${DEPLOYED} $fn"
  printf "      → %-12s " "$fn"
  # --dir 传相对路径，配合 tcb() 里的 cd "$ROOT"
  #
  # ⚠ `yes |` 不能省（第 8 个坑）：
  #   函数没在 cloudbaserc.json 的 functions[] 里注册时，
  #   CLI 会问「Continue deployment with the default configuration? (y/N)」
  #   然后**一直等 stdin**。非交互环境下没人回答，
  #   表现为「部署跑了几小时不出结果、进程还在但 CPU 为 0」。
  #   （share 函数就这么卡了 3 小时，差点被误判成云端装依赖慢。）
  #   凡是 CLI 可能提问，一律用 yes| 把输入喂上。
  #   另外「新增云函数后必须在 cloudbaserc.json 注册」是根治办法。
  OUT=$(yes | tcb fn deploy "$fn" \
        --env-id "$ENV_ID" \
        --region "$REGION" \
        --dir "cloudfunctions/$fn" \
        --runtime Nodejs20.19 \
        --install-dependency true \
        --force 2>&1)
  RC=$?
  # ⚠ 成功判定必须同时满足两条，缺一不可。
  #   1) exit code 为 0
  #   2) 输出里有成功标记
  #
  #   踩过的坑：CLI 3.8.5 实际输出的是英文
  #   "Cloud function deployed successfully!"，
  #   不是中文「部署成功」。之前只 grep 中文，于是
  #   真实成功的部署被判成失败。
  #   两种语言都匹配，兼容 CLI 版本差异。
  if [ $RC -eq 0 ] && echo "$OUT" | grep -qiE "部署成功|deployed successfully"; then
    echo "✅"
  else
    echo "❌"
    echo "$OUT" | tail -8 | sed 's/^/           /'
    FAILED="$FAILED $fn"
  fi
done

echo ""
echo "========================================"
if [ -n "$SKIPPED" ]; then
  # ⚠ 有函数被跳过时**绝不能**报「全部部署完成」。
  #   分隔符写错（ONLY 用逗号而脚本按空格分词）就会走到这里，
  #   0 个函数真正上传却显示成功 —— 这种假成功最难查。
  echo " ❌ 有函数被跳过：$SKIPPED"
  echo "    分隔符用空格或逗号都行，但函数名必须是 cloudfunctions/ 下的真实目录名。"
  echo "    实际已部署：${DEPLOYED:- 无}"
  exit 1
elif [ -z "$DEPLOYED" ]; then
  echo " ❌ 一个函数都没部署"
  exit 1
elif [ -z "$FAILED" ]; then
  echo " ✅ 全部部署完成（${DEPLOYED}）"
else
  echo " ⚠️  部分失败。已部署：${DEPLOYED}｜失败：$FAILED"
  exit 1
fi
echo "========================================"
echo ""
echo "接下来在云开发控制台完成："
echo ""
echo "  1. 建 12 个集合（权限统一选「所有用户可读，仅创建者可写」）："
echo "     ⚠️ 不要选「仅创建者可读写」，那样读不到官方教材目录"
echo "     users  books      user_books  cards  questions"
echo "     answers checkins  user_medals quota  networks"
echo "     shares  submissions"
echo ""
echo "  2. 导入教材目录："
echo "     node database/init-cloud.js"
echo "     （会导入 49 本目录教材；另有 7 本自编正文用 upload-content.js 传）"
echo ""
echo "  3. 开通 AI 能力（云开发控制台 → AI 能力）："
echo "     大模型调用（语音合成是内置能力，无需开通）"
echo ""
echo "  4. 编译运行，Console 无 [memor] 登录失败 即成功"
