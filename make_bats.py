# -*- coding: utf-8 -*-
"""用 GBK 编码生成项目内启动脚本：
- Start.bat        静默版：VBS 隐藏启动 node（真正无窗口），等端口就绪后打开浏览器（桌面 .lnk 指向它）
- start-hidden.vbs 隐藏启动 node 的 VBS 脚本（Start.bat 调用，wscript 执行，window style 0 = 隐藏）
- ViewStart.bat    诊断版：前台运行 node（日志直接显示，Ctrl+C 停止，窗口不自动关闭）

跨设备可用：ROOT 取本脚本所在目录；cmd 在中文 Windows 默认代码页 936(GBK)，UTF-8 写中文会乱码，故必须存成 GBK。
用法：python make_bats.py
"""
import io, os

ROOT = os.path.dirname(os.path.abspath(__file__))

def head():
    return '@echo off\r\n'

# 公共段：等端口就绪后打开浏览器
browser = 'start "" "http://localhost:3000"\r\n'

# 1. 静默版 Start.bat（桌面 .lnk 指向它）：wscript 隐藏启动 node，真正无窗口
start_hidden_vbs = (
    'Set ws = CreateObject("WScript.Shell")\r\n'
    'Set fso = CreateObject("Scripting.FileSystemObject")\r\n'
    'ws.CurrentDirectory = fso.GetParentFolderName(WScript.ScriptFullName)\r\n'
    'ws.Run "node server.js", 0, False\r\n'
)
silent = head() + (
    'cd /d %~dp0\r\n'
    'wscript //nologo "%~dp0start-hidden.vbs"\r\n'
    'ping -n 3 127.0.0.1 >nul\r\n'
) + browser + 'exit /b\r\n'

# 2. 可见诊断版 ViewStart.bat：前台运行 node，日志直接显示在此窗口
visible = head() + (
    'cd /d %~dp0\r\n'
    'echo 前台启动服务，日志将显示在此窗口（Ctrl+C 停止）...\r\n'
    'node server.js\r\n'
    'echo.\r\n'
    'echo 服务已退出。按任意键关闭此窗口。\r\n'
    'pause >nul\r\n'
    'exit /b\r\n'
)

def write_gbk(path, content):
    data = content.encode('gbk')
    with io.open(path, 'wb') as f:
        f.write(data)
    print('written:', path, len(data), 'bytes (GBK)')

write_gbk(os.path.join(ROOT, 'Start.bat'), silent)
write_gbk(os.path.join(ROOT, 'start-hidden.vbs'), start_hidden_vbs)
write_gbk(os.path.join(ROOT, 'ViewStart.bat'), visible)
print('DONE')
