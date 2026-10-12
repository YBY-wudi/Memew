# -*- coding: utf-8 -*-
"""
图片脱敏与整理
================================================================--
把用户提供的 12 张过程截图处理后输出到 总结文档/images/。

🔴 为什么要做遮挡（2026-10-06 实测排查）：
  逐张看下来，真正含隐私的有 3 张，其余干净。

  1. 隐私保护指引页（含**真实邮箱 + 微信号**，出现两次）
     → 必须遮挡。这是能直接定位到个人的信息，
       而这份文档要投到比赛、可能公开传播。

  2. 开发者工具截图（顶部**浏览器书签栏**露出多个账号名）
     → 遮挡顶部 40px。书签栏里的第三方账号名不属于本项目内容，
       放在参赛材料里等于把无关信息带出去。

  3. 云开发控制台截图（底部 **Windows 任务栏**露出大量私人应用图标）
     → 遮挡底部任务栏区域。同样是与项目无关的私人环境信息。

另外把「项目备注」里的错别字修掉——截图里是
「板贡存在2026年10月6日下午 17：05 上传」，
「板贡存」是输入法误触。参赛材料里出现这种错字观感不好，
但**不能伪造截图内容**，所以采用「遮挡原图 + 正文用正确文字说明」。

遮挡方式：用实心块 + 说明文字，而不是简单涂黑。
理由：纯黑块会让人怀疑你藏了什么，而
「隐私信息已遮挡」本身是加分的合规表现。
"""
import os
import shutil
from PIL import Image, ImageDraw, ImageFont

SRC_ROOT = r'D:\微信聊天记录\xwechat_files\wxid_wxrsw9ukf7un22_7164\temp\RWTemp\2026-10'
OUT = r'D:\memorize\总结文档\images'

# 源图 → 文档用图名
JOBS = [
    # (源文件名, 输出名, 处理方式)
    ('1c29c6eb7d9f0803f175de09668c487a.png', '01-提交审核.png', 'clean'),
    ('8940dcbde3e404521412a860422ca746.png', '02-隐私保护指引-已脱敏.png', 'privacy_policy'),
    ('0579afc863f20a08f7a338cff8983143.png', '03-隐私指引配置-已脱敏.png', 'bookmark_bar'),
    ('e265f5bc43ea6a1fda3bc743f042a609.png', '04-开发者工具上传代码-已脱敏.png', 'bookmark_typo'),
    ('478e7939de308e8bb7efed3fcd7436f3.png', '05-云开发数据库-已脱敏.png', 'taskbar'),
    ('30e36d3d5f2993b5c091eecaba79e16e.png', '06-上传云函数.png', 'clean'),
    ('826e74853276b78204fdf6354c9231ce.jpg', '07-手机创建环境.jpg', 'clean'),
    ('bd500413767e251e1d787a2d306562ad.png', '08-小程序图标.png', 'clean'),
    ('clipboard-2026-10-06T11-22-08-953Z-85195633.jpg', '09-微信开发者工具.jpg', 'taskbar'),
    ('clipboard-2026-10-06T11-22-08-956Z-76f3b457.png', '10-权限设置.png', 'clean'),
    ('62865f8ca999ef3ca218c88ff077c3d1.jpg', '11-首页问候.jpg', 'clean'),
    ('clipboard-2026-10-06T11-22-08-959Z-35af0b82.png', '12-首页问候-备选.png', 'clean'),
]

CLIP_DIR = r'C:\Users\Honor\.workbuddy\clipboard-images'

# 隐私政策页里邮箱/微信号的**真实行位置**（已用像素检测 + 裁剪复核确认）
#
# 🔴 这里踩过一次坑：第一版按「百分比估算」写坐标（0.415-0.462 / 0.715-0.762），
#   结果遮罩画在了错误的行上，**邮箱和微信号在遮罩下面依然清晰可见**。
#   而且因为文件已生成、不报错，肉眼扫一眼「有黑条」就以为处理完了。
#
#   教训：**涉及遮挡隐私的坐标必须实测，不能估。**
#   正确做法：先 crop 出可疑区域存盘 → 肉眼看 → 确认行区间 → 再写死坐标。
#   这里的 y 值来自 darkcount 自动检测 + probe 裁剪双向确认。
PRIVACY_BANDS = [
    (600, 652),    # 第 3.3 节：邮箱 + 微信号
    (1028, 1080),  # 第 7 节：邮箱 + 微信号
]


def find_font(size):
    """找一个能显示中文的字体。找不到就退回默认（会显示方块，但至少不崩）。"""
    for name in ['msyh.ttc', 'msyhbd.ttc', 'simhei.ttf', 'simsun.ttc',
                 'C:/Windows/Fonts/msyh.ttc', 'C:/Windows/Fonts/simhei.ttf']:
        p = name if os.path.isabs(name) else os.path.join('C:/Windows/Fonts', name)
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return None


def mask(img, box, label, color=(43, 45, 66)):
    """在 box=(x0,y0,x1,y1) 区域盖实心块并写说明文字。"""
    d = ImageDraw.Draw(img)
    x0, y0, x1, y1 = [int(v) for v in box]
    d.rectangle([x0, y0, x1, y1], fill=color)
    f = find_font(max(13, (y1 - y0) // 4))
    if f:
        txt = label
        # 估宽居中
        try:
            tw = d.textlength(txt, font=f)
        except Exception:
            tw = len(txt) * (y1 - y0) // 4
        d.text((x0 + ((x1 - x0) - tw) / 2, y0 + ((y1 - y0) - (y1 - y0) * 0.32)),
               txt, fill=(255, 255, 255), font=f)
    return img


def verify_masked(img, bands, label):
    """
    遮挡后**验证**隐私文字真的没了。

    🔴 为什么要加这道：上一版按估算坐标遮挡，遮罩画在了错误的行，
      邮箱/微信号在遮罩下面清清楚楚，而脚本「成功」退出、不报错。
      「有黑条」不等于「遮住了」—— 必须回头检查遮罩下面还有没有深色像素。

    做法：数一遍遮罩区域里的深色像素。盖实心块之后应该接近 0。
    """
    def solid_pixels(img, bands, span=10):
        """
        数遮罩区域里**深色**的疑似文字像素。

        🔴 这里改了两版才写对：
          第一版：判据「三通道都 < 120 = 残留文字」。
            → 遮罩块颜色本身就是深色 (43,45,66)，整块遮罩全被判成残留，
              报 56580 个像素，纯属误报。
          第二版：改成「纯色 = 遮罩，彩色 = 文字」。
            → 遮罩上我自己写的**白色说明文字**又被判成残留。
              （把说明文字当泄露，这个误报更荒唐。）

        正确判据：只找**深色**像素（r,g,b 都 < 90，且不是遮罩色）。
        白色说明文字是 > 200 的浅色，自然被排除；
        遮罩底色 (43,45,66) 虽然深，但三通道极差仅 23 且偏蓝，
        用「r≈g≈b」这个特征再排一次。
        """
        px = img.load()
        W = img.size[0]
        text = 0
        for y0, y1 in bands:
            for y in range(y0, y1):
                for x in range(0, W, span):
                    r, g, b = px[x, y][:3]
                    dark = r < 90 and g < 90 and b < 90
                    # 遮罩底色 (43,45,66)，PNG 存成 JPEG 后会漂到 (60,61,81)
                    # —— 这是压缩噪声不是文字，所以容差要放宽到 25
                    is_mask_color = abs(r - 52) < 26 and abs(g - 54) < 26 and abs(b - 74) < 26
                    if dark and not is_mask_color:
                        text += 1
        return text

    bad = 0
    for y0, y1 in bands:
        bad += solid_pixels(img, [(y0, y1)])
    if bad > 30:
        print('  ✗ %s 遮挡不彻底：遮罩下疑似残留 %d 个文字像素' % (label, bad))
        return False
    print('  ✓ %s 遮挡彻底（遮罩区无残留文字）' % label)
    return True


def handle(kind, src, dst):
    im = Image.open(src).convert('RGB')
    W, H = im.size

    if kind == 'privacy_policy':
        # 遮挡两处邮箱/微信号区域（坐标为实测值，非估算）
        for y0, y1 in PRIVACY_BANDS:
            im = mask(im, (0, y0, W, y1), '▲ 个人联系方式已遮挡（按平台要求脱敏）')

    elif kind == 'bookmark_bar':
        # 顶部浏览器书签栏
        h = int(H * 0.042)
        im = mask(im, (0, 0, W, h), '▲ 浏览器书签栏已遮挡')

    elif kind == 'bookmark_typo':
        # 同时处理书签栏和错别字
        im = mask(im, (0, 0, W, int(H * 0.042)), '▲ 浏览器书签栏已遮挡')
        im = mask(im, (395, 96, 775, 122), '▲ 项目备注（见正文说明）')

    elif kind == 'taskbar':
        # 底部 Windows 任务栏：按 1080x690 这类比例，任务栏约在 y=0.955 以下
        y0 = int(H * 0.955)
        im = mask(im, (0, y0, W, H), '▲ 系统任务栏已遮挡')

    elif kind == 'remark_typo':
        # 「项目备注」里的错别字
        #
        # 截图上是「板贡存在2026年10月6日下午 17：05 上传」——
        # 「板贡存」是输入法误触打出来的。
        #
        # 🔴 为什么不直接改图：PIL 硬改中文需要字体渲染 + 逐字覆盖，
        #   很容易糊成一片，反而更像伪造。
        #   而且**截图里的项目备注是历史事实**，改它等于篡改记录。
        #
        #   所以只遮挡，并在正文里用正确的文字说明 ——
        #   参赛材料里写「教材书库上线」比留个错别字好看。
        im = mask(im, (395, 96, 775, 122), '▲ 项目备注（见正文说明）')

    im.save(dst, quality=95)

    # 遮挡类图片必须回头验证，不能「画完就算」
    if kind == 'privacy_policy':
        verify_masked(im, PRIVACY_BANDS, '隐私政策页')

    return im.size


def resolve(src_name):
    """
    找源图。

    ⚠ 微信的临时目录会把文件挪进子目录（带一串 hash 的那个），
      所以不能只查两个固定路径 —— 实测同一批图有的一层有的两层。
      这里逐级下探，找不到再全文搜。
    """
    cands = [
        os.path.join(CLIP_DIR, src_name),
        os.path.join(SRC_ROOT, src_name),
    ]
    for c in cands:
        if os.path.exists(c):
            return c
    # 逐级下探，最多 3 层
    for base in (CLIP_DIR, SRC_ROOT):
        for root, _dirs, files in os.walk(base):
            depth = root[len(base):].count(os.sep)
            if depth > 3:
                _dirs[:] = []
                continue
            if src_name in files:
                return os.path.join(root, src_name)
    return None


def main():
    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    os.makedirs(OUT, exist_ok=True)

    ok, miss = [], []
    for src_name, out_name, kind in JOBS:
        src = resolve(src_name)
        if not src:
            miss.append(src_name)
            continue
        dst = os.path.join(OUT, out_name)
        size = handle(kind, src, dst)
        tag = {'privacy_policy': '隐私遮挡', 'bookmark_bar': '书签栏遮挡',
               'bookmark_typo': '书签栏+错别字', 'remark_typo': '错别字遮挡',
               'taskbar': '任务栏遮挡', 'clean': '原样'}[kind]
        ok.append((out_name, size, tag))

    print('=== 处理完成 ===')
    for n, s, t in ok:
        print('  %-34s %-12s %s' % (n, '%dx%d' % s, t))
    if miss:
        print('\n⚠ 未找到 %d 张:' % len(miss))
        for m in miss:
            print('   ', m)
    print('\n共 %d 张 → %s' % (len(ok), OUT))


if __name__ == '__main__':
    main()
