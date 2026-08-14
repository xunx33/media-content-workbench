# -*- coding: utf-8 -*-
"""生成桌面 .lnk 快捷方式：一键静默启动服务并打开工作台(PWA/浏览器)。
跨设备可用：路径全部自动定位——ROOT 取本脚本所在目录，桌面路径取系统 API。
零依赖：任何 Windows 自带 Python 都能跑（用 VBS 替代 pywin32）。
"""
import os
import sys
import tempfile

ROOT = os.path.dirname(os.path.abspath(__file__))
bat_path = os.path.join(ROOT, 'StartWorkbench.bat')
icon_path = os.path.join(ROOT, 'icons', 'icon-512.ico')

if not os.path.exists(bat_path):
    print('FAIL 找不到:', bat_path)
    raise SystemExit(1)

# 获取桌面路径（用环境变量，避免 ctypes 依赖）
desktop = os.path.join(os.environ.get('USERPROFILE', ''), 'Desktop')
if not os.path.exists(desktop):
    desktop = os.path.join(os.environ.get('HOME', ''), 'Desktop')
if not os.path.exists(desktop):
    desktop = os.path.expanduser('~/Desktop')

lnk_name = '新媒体数据工作台.lnk'
lnk_path = os.path.join(desktop, lnk_name)

# VBS 内容（路径用变量，避免中文直接出现在 VBS 代码中）
vbs = """Set ws = CreateObject("WScript.Shell")
Set sc = ws.CreateShortcut("{lnk}")
sc.TargetPath = "{target}"
sc.WorkingDirectory = "{workdir}"
sc.Description = "{desc}"
sc.IconLocation = "{icon}, 0"
sc.WindowStyle = 7
sc.Save
""".format(
    lnk=lnk_path,
    target=bat_path,
    workdir=ROOT,
    desc='一键启动服务并打开新媒体数据工作台',
    icon=icon_path if os.path.exists(icon_path) else ''
)

# 写 VBS 文件：用 GBK 编码（wscript.exe 用 GBK 读取，避免中文乱码）
# errors='replace' 防止某些特殊字符导致写入失败
with tempfile.NamedTemporaryFile(mode='w', suffix='.vbs', delete=False, encoding='gbk', errors='replace') as f:
    f.write(vbs)
    vbs_path = f.name

try:
    ret = os.system('wscript //nologo "{}"'.format(vbs_path))
    if ret != 0:
        print('FAIL VBS 执行失败')
        sys.exit(1)
    # 验证文件是否创建成功
    if not os.path.exists(lnk_path):
        print('FAIL 快捷方式未创建')
        sys.exit(1)
    print('OK 已创建:', lnk_path)
    print('目标:', bat_path)
    print('工作目录:', ROOT)
    print('窗口样式: 7 (最小化启动)')
finally:
    try:
        os.unlink(vbs_path)
    except:
        pass
