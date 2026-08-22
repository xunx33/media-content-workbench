' Media Data Workbench - fully background launcher (no console window at all)
' 1) launches the service hidden, 2) waits until it is ready, 3) opens the browser.
Set ws = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
ws.CurrentDirectory = fso.GetParentFolderName(WScript.ScriptFullName)

' Silent mode: start-ui.js detects the port, spawns the server, then exits
ws.Environment("PROCESS")("MCB_SILENT") = "1"
ws.Run "node start-ui.js", 0, False

' Wait for the service to be ready (max ~8s), then open the default browser
Dim port, url, x, i, ready
port = ws.Environment("PROCESS")("PORT")
If port = "" Then port = "3000"
url = "http://localhost:" & port
ready = False
Set x = CreateObject("MSXML2.XMLHTTP")
For i = 1 To 20
  WScript.Sleep 400
  On Error Resume Next
  x.Open "GET", url & "/", False
  x.Send
  If Err.Number = 0 And x.Status = 200 Then
    ready = True
  End If
  On Error GoTo 0
  If ready Then Exit For
Next

If ready Then
  ws.Run url, 1, False
Else
  MsgBox "Cannot reach the workbench service at " & url & "." & vbCrLf & _
         "The server may have failed to start or the port is already in use.", 48, "Media Data Workbench"
End If
