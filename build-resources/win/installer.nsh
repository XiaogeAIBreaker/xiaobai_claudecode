; Windows NSIS 安装程序自定义脚本
; 用于 Claude 安装助手的特殊安装逻辑

!macro preInit
  ; 设置语言为简体中文
  SetRegView 64
  WriteRegExpandStr HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation "$INSTDIR"
  WriteRegExpandStr HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation "$INSTDIR"
!macroend

!macro customInit
  ; 检查管理员权限
  UserInfo::GetAccountType
  pop $0
  ${If} $0 != "admin"
    MessageBox MB_ICONSTOP "该程序需要管理员权限才能正确安装。请右键选择'以管理员身份运行'。"
    SetErrorLevel 740 ; ERROR_ELEVATION_REQUIRED
    Quit
  ${EndIf}

  ; 检查系统版本
  ${If} ${AtMostWin7}
    MessageBox MB_ICONSTOP "Claude 安装助手需要 Windows 10 或更高版本。"
    Quit
  ${EndIf}

  ; 检查磁盘空间 (需要至少 500MB)
  ${GetRoot} "$INSTDIR" $R0
  ${DriveSpace} "$R0" "/D=F /S=M" $R1
  ${If} $R1 < 500
    MessageBox MB_ICONSTOP "磁盘空间不足。安装 Claude 安装助手至少需要 500MB 可用空间。"
    Quit
  ${EndIf}
!macroend

!macro customInstall
  ; 创建配置目录
  CreateDirectory "$APPDATA\claude-installer"

  ; 设置文件权限
  AccessControl::GrantOnFile "$APPDATA\claude-installer" "(S-1-5-32-545)" "FullAccess"

  ; 添加到 Windows 防火墙例外
  SimpleFC::AddApplication "Claude安装助手" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" 0 2 "" 1

  ; 创建开始菜单项
  CreateDirectory "$SMPROGRAMS\Claude工具"
  CreateShortCut "$SMPROGRAMS\Claude工具\Claude安装助手.lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" 0
  CreateShortCut "$SMPROGRAMS\Claude工具\卸载Claude安装助手.lnk" "$INSTDIR\Uninstall ${PRODUCT_FILENAME}.exe" "" "$INSTDIR\Uninstall ${PRODUCT_FILENAME}.exe" 0

  ; 创建桌面快捷方式
  CreateShortCut "$DESKTOP\Claude安装助手.lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" 0
!macroend

!macro customUnInstall
  ; 清理配置文件（可选）
  MessageBox MB_YESNO "是否删除所有配置文件和缓存？$\n$\n选择'是'将完全移除所有相关数据。$\n选择'否'将保留配置文件以便将来使用。" IDNO skip_config_cleanup

  RMDir /r "$APPDATA\claude-installer"
  RMDir /r "$LOCALAPPDATA\claude-installer"

  skip_config_cleanup:

  ; 移除防火墙例外
  SimpleFC::RemoveApplication "$INSTDIR\${APP_EXECUTABLE_FILENAME}"

  ; 删除开始菜单项
  Delete "$SMPROGRAMS\Claude工具\Claude安装助手.lnk"
  Delete "$SMPROGRAMS\Claude工具\卸载Claude安装助手.lnk"
  RMDir "$SMPROGRAMS\Claude工具"

  ; 删除桌面快捷方式
  Delete "$DESKTOP\Claude安装助手.lnk"
!macroend