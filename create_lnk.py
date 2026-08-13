# -*- coding: utf-8 -*-
"""生成桌面 .lnk 快捷方式：一键静默启动服务并打开工作台(PWA/浏览器)。
跨设备可用：路径全部自动定位——ROOT 取本脚本所在目录，桌面路径取系统 API。
用法：python create_lnk.py（需 pywin32：pip install pywin32）
"""
import os
import pythoncom
from win32com.shell import shell, shellcon

ROOT = os.path.dirname(os.path.abspath(__file__))
desktop = shell.SHGetFolderPath(0, shellcon.CSIDL_DESKTOPDIRECTORY, None, 0)
lnk_path = os.path.join(desktop, '新媒体工作台（启动）.lnk')

bat_path = os.path.join(ROOT, 'StartWorkbench.bat')
icon_path = os.path.join(ROOT, 'icons', 'icon-512.ico')
if not os.path.exists(bat_path):
    print('FAIL 找不到:', bat_path)
    raise SystemExit(1)

lnk = pythoncom.CoCreateInstance(shell.CLSID_ShellLink, None,
                                 pythoncom.CLSCTX_INPROC_SERVER,
                                 shell.IID_IShellLink)
lnk.SetPath(bat_path)
lnk.SetWorkingDirectory(ROOT)
lnk.SetDescription('一键启动服务并打开新媒体工作台')
lnk.SetIconLocation(icon_path, 0)
lnk.SetShowCmd(7)  # 7 = SW_SHOWMINIMIZED 最小化运行

persist = lnk.QueryInterface(pythoncom.IID_IPersistFile)
persist.Save(lnk_path, 0)

print('OK 已创建:', lnk_path)
print('目标:', bat_path)
print('图标:', icon_path)
print('窗口样式: 7 (最小化)')
