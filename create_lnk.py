import os
import pythoncom
from win32com.shell import shell, shellcon

# 桌面路径（用系统 API 取，避免硬编码用户名）
desktop = shell.SHGetFolderPath(0, shellcon.CSIDL_DESKTOPDIRECTORY, None, 0)
lnk_path = os.path.join(desktop, '新媒体工作台（启动）.lnk')

lnk = pythoncom.CoCreateInstance(shell.CLSID_ShellLink, None,
                                 pythoncom.CLSCTX_INPROC_SERVER,
                                 shell.IID_IShellLink)
lnk.SetPath(r'C:\Users\Administrator\Desktop\启动新媒体工作台.bat')
lnk.SetWorkingDirectory(r'D:\Tencent\WBspace\2026-08-10-09-55-24')
lnk.SetDescription('一键启动服务并打开新媒体工作台')
lnk.SetIconLocation(r'D:\Tencent\WBspace\2026-08-10-09-55-24\icons\icon-512.ico', 0)
lnk.SetShowCmd(7)  # 7 = SW_SHOWMINIMIZED 最小化运行

persist = lnk.QueryInterface(pythoncom.IID_IPersistFile)
persist.Save(lnk_path, 0)

print('OK 已创建:', lnk_path)
print('目标:', r'C:\Users\Administrator\Desktop\启动新媒体工作台.bat')
print('图标:', r'D:\Tencent\WBspace\2026-08-10-09-55-24\icons\icon-512.ico')
print('窗口样式: 7 (最小化)')
