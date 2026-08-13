# -*- coding: utf-8 -*-
"""用 GBK 编码生成项目内两个启动 bat（StartWorkbench.bat 静默版 / ViewStart.bat 可见诊断版）：
优先打开桌面 PWA 快捷方式，否则回退浏览器。
跨设备可用：ROOT 取本脚本所在目录。cmd 在中文 Windows 默认代码页 936(GBK)，UTF-8 写中文会乱码，故必须存成 GBK。
用法：python make_bats.py
"""
import io, os

ROOT = os.path.dirname(os.path.abspath(__file__))
PWA_NAME = '新媒体内容发布工作台.lnk'

# 公共段：探测 PWA 快捷方式（桌面 > Application Shortcuts），有则开 PWA，无则开浏览器
pwa_common = (
    'set "PWA="\r\n'
    'if exist "%USERPROFILE%\\Desktop\\' + PWA_NAME + '" set "PWA=%USERPROFILE%\\Desktop\\' + PWA_NAME + '"\r\n'
    'if not defined PWA if exist "%LOCALAPPDATA%\\Microsoft\\Windows\\Application Shortcuts\\' + PWA_NAME + '" set "PWA=%LOCALAPPDATA%\\Microsoft\\Windows\\Application Shortcuts\\' + PWA_NAME + '"\r\n'
    'if defined PWA ( start "" "%PWA%" ) else ( start "" "http://localhost:3000" )\r\n'
)

def head():
    return '@echo off\r\n'

# 1. 静默版 StartWorkbench.bat（桌面 .lnk 指向它）
silent = head() + (
    'cd /d %~dp0\r\n'
    'set MCB_SILENT=1\r\n'
    'start "" /min node start-ui.js\r\n'
    'ping -n 3 127.0.0.1 >nul\r\n'
) + pwa_common + 'exit /b\r\n'

# 2. 可见诊断版 ViewStart.bat
visible = head() + (
    'cd /d %~dp0\r\n'
    'set MCB_SILENT=1\r\n'
    'start "" /min node start-ui.js\r\n'
    'ping -n 3 127.0.0.1 >nul\r\n'
) + pwa_common + (
    'echo.\r\n'
    'echo 服务已启动，工作台已打开。按任意键关闭此窗口。\r\n'
    'pause >nul\r\n'
    'exit /b\r\n'
)

def write_gbk(path, content):
    data = content.encode('gbk')
    with io.open(path, 'wb') as f:
        f.write(data)
    print('written:', path, len(data), 'bytes (GBK)')

write_gbk(os.path.join(ROOT, 'StartWorkbench.bat'), silent)
write_gbk(os.path.join(ROOT, 'ViewStart.bat'), visible)
print('DONE')
