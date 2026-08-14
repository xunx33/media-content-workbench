# -*- coding: utf-8 -*-
"""用 GBK 编码生成项目内两个启动 bat（StartWorkbench.bat 静默版 / ViewStart.bat 可见诊断版）：
后台启动 node 服务，等端口就绪后打开浏览器。
跨设备可用：ROOT 取本脚本所在目录。cmd 在中文 Windows 默认代码页 936(GBK)，UTF-8 写中文会乱码，故必须存成 GBK。
用法：python make_bats.py
"""
import io, os

ROOT = os.path.dirname(os.path.abspath(__file__))

def head():
    return '@echo off\r\n'

# 公共段：等端口就绪后打开浏览器
browser = 'start "" "http://localhost:3000"\r\n'

# 1. 静默版 StartWorkbench.bat（桌面 .lnk 指向它）
silent = head() + (
    'cd /d %~dp0\r\n'
    'start "" /min node server.js\r\n'
    'ping -n 3 127.0.0.1 >nul\r\n'
) + browser + 'exit /b\r\n'

# 2. 可见诊断版 ViewStart.bat
visible = head() + (
    'cd /d %~dp0\r\n'
    'start "" /min node server.js\r\n'
    'ping -n 3 127.0.0.1 >nul\r\n'
) + browser + (
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
