// Minimal i18n — simple key-value translation

import { createContext } from 'svelte';

const baseLocales: Record<string, Record<string, string>> = {
  'zh-CN': {
    'common.list': '列表',
    'common.prev': '上一页',
    'common.pageOf': '第 {page} 页，共 {total} 页',
    'common.areYouSure': '确认操作？',
    'common.backToList': '返回列表',
    'common.refresh': '刷新',
    'common.importData': '导入数据',
    'common.upload': '上传',
    'common.returnHome': '返回首页',
    // Common
    'common.save': '保存',
    'common.cancel': '取消',
    'common.create': '新建',
    'common.edit': '编辑',
    'common.delete': '删除',
    'common.batchDeletePartialFail': '批量删除部分失败：{failed}/{total} 条未成功',
    'common.batchDeleteSuccess': '成功删除 {count} 条记录',
    'common.search': '搜索...',
    'common.confirm': '确定',
    'common.loading': '加载中...',
    'common.noData': '暂无数据',
    'common.noDataHint': '暂无数据，请创建第一条记录。',
    'common.actions': '操作',
    'common.total': '共 {total} 条',
    'common.page': '{current} / {total}',
    'common.export': '导出',
    'common.import': '导入',
    'common.clone': '克隆',
    'common.autoSaving': '自动保存中...',
    'common.autoSaved': '已自动保存',
    'common.selectAll': '全选',
    'common.batchDelete': '批量删除 ({count})',
    'common.unsavedChanges': '有未保存的修改，确定离开吗？',
    'common.unsaved': '未保存',
    'common.deleteConfirm': '确定要删除这条记录吗？此操作不可撤销。',
    'common.batchDeleteConfirm': '确定要删除选中的 {count} 条记录吗？此操作不可撤销。',
    'common.confirmAction': '确认操作',
    'common.operationSuccess': '操作成功',
    'common.operationFailed': '操作失败',
    'common.createSuccess': '创建成功',
    'common.updateSuccess': '更新成功',
    'common.deleteSuccess': '删除成功',
    'common.loginFailed': '登录失败',
    'common.home': '首页',
    'common.logout': '退出登录',
    'common.toggleTheme': '切换主题',
    'common.switchLanguage': '切换语言',
    'common.goToSite': '返回工作台',
    'common.clear': '清除',
    'common.menu': '菜单',
    'common.darkMode': '暗色模式',
    'common.lightMode': '亮色模式',
    'common.detail': '详情',
    'common.show': '查看',
    'common.loadFailed': '加载失败: {message}',
    'common.pageNotFound': '页面未找到',
    'common.error': '出错了',
    'common.retry': '重试',
    'common.yes': '是',
    'common.no': '否',
    'common.undo': '撤销',
    'common.filter': '筛选',
    'common.reset': '重置',
    'common.welcome': '欢迎使用 {title}',
    'common.dashboardHint': '从侧边栏选择一个资源开始。',
    'common.redirecting': '正在跳转到登录页...',
    'common.expand': '展开',
    'common.collapse': '收起',
    'common.close': '关闭',
    'common.copy': '复制',
    'common.copyAll': '复制全部',
    'common.copied': '已复制',
    'common.next': '下一步',
    'common.back': '返回',
    'common.step': '步骤',
    'common.columns': '列',
    'common.perPage': '每页',
    'common.copyId': '复制 ID',
    'common.showMore': '展开更多',
    'common.showLess': '收起',
    'common.showPassword': '显示密码',
    'common.hidePassword': '隐藏密码',
    'common.toggleSidebar': '切换侧边栏',
    'common.configRequired': '需要配置',
    'common.removeImage': '移除图片',
    // Field
    'field.enterValue': '输入{label}',
    'field.selectPlaceholder': '请选择',
    'field.tagsPlaceholder': '输入标签后按回车...',
    'field.noOptions': '无可用选项',
    'field.addImage': '添加图片',
    // Config errors
    'config.missingEnvTitle': '环境配置缺失',
    'config.missingEnvDescription': '应用无法启动，因为缺少必要的环境变量。',
    'config.addToEnvFile': '请在 .env 文件中添加以下内容：',
    'config.envFilePath': '文件路径: .env',
    'config.reload': '配置完成后刷新页面',
    'config.reloadButton': '重新加载页面',
    // Auth pages
    'auth.login': '登录',
    'auth.register': '注册',
    'auth.forgotPassword': '忘记密码',
    'auth.resetPassword': '重置密码',
    'auth.email': '邮箱',
    'auth.usernameOrEmail': '用户名或邮箱',
    'auth.usernameOrEmailRequired': '请输入用户名或邮箱',
    'auth.identifierPlaceholder': '用户名 / name@example.com',
    'auth.password': '密码',
    'auth.confirmPassword': '确认密码',
    'auth.rememberMe': '记住我',
    'auth.loginButton': '登录',
    'auth.registerButton': '注册',
    'auth.sendResetLink': '发送重置链接',
    'auth.backToLogin': '返回登录',
    'auth.noAccount': '还没有账号？',
    'auth.hasAccount': '已有账号？',
    'auth.forgotPasswordLink': '忘记密码？',
    'auth.forgotPasswordDescription': '输入您的邮箱地址，我们将发送重置密码的链接。',
    'auth.resetPasswordDescription': '设置一个新的登录密码。',
    'auth.resetLinkSent': '重置链接已发送，请查看您的邮箱。',
    'auth.passwordMismatch': '两次输入的密码不一致',
    'auth.emailRequired': '请输入邮箱',
    'auth.passwordRequired': '请输入密码',
    'auth.registerSuccess': '注册成功',
    'auth.welcomeBack': '欢迎回来',
    'auth.welcomeMessage': '登录以继续使用管理后台',
    'auth.createAccount': '创建账号',
    'auth.createAccountMessage': '填写信息以创建您的账号',
    // AutoSave
    'autoSave.idle': '已保存',
    'autoSave.saving': '保存中...',
    'autoSave.saved': '已保存',
    'autoSave.error': '保存失败',
    // Empty states
    'empty.title': '暂无数据',
    'empty.description': '没有找到符合条件的记录。',
    'empty.noMore': '没有更多了',
    // DevTools
    'devtools.title': '开发者工具 (Ctrl+Shift+D)',
    // Validation
    // Chat
    'chat.title': 'AI 助手',
    'chat.contextInfo': '当前上下文：{resource}',
    'chat.actionButton': '执行',
    'chat.historyRestored': '已恢复聊天记录',
    'chat.historyClear': '聊天记录已清除',
    // Validation
    'validation.required': '此字段为必填项',
    'validation.minLength': '最少 {min} 个字符',
    'validation.maxLength': '最多 {max} 个字符',
    'validation.invalidEmail': '请输入有效的邮箱地址',
    'validation.invalidUrl': '请输入有效的 URL 地址',
    'validation.invalidNumber': '请输入有效的数字',
    'validation.invalidFormat': '格式不正确',
    // Settings
    'settings.title': '设置',
    'settings.profile': '个人资料',
    'settings.appearance': '外观设置',
    'settings.about': '关于',
    'settings.general': '通用',
    'settings.security': '安全设置',
    'settings.integrations': '第三方集成',
    'settings.notifications': '通知设置',
    'settings.api': 'API 设置',
    'settings.developer': '开发者',
    'settings.workspace': '工作区',
    'settings.securityDescription': '管理您的密码、活跃会话和双重身份验证偏好。',
    'settings.integrationsDescription': '连接和管理工作区的第三方服务扩展。',
    'settings.notificationsDescription': '配置系统警报的接收方式和时机。',
    'settings.apiDescription': '生成并管理安全 API 密钥，以便集成外部程序脚本。',
    'security.twoFactorAuth': '双重身份验证 (2FA)',
    'security.twoFactorDescription': '启用后，在输入密码后还需要输入手机验证码，为账户增加额外安全保障。',
    'security.enable2fa': '启用双重身份验证',
    'security.twoFactorActive': '双重身份验证已启用。新登录时将需要验证码。',
    'security.twoFactorInactive': '双重身份验证已禁用。建议开启以保护账户安全。',
    'security.passwordLastChanged': '上次修改：{time}',
    'security.activeSessions': '活跃会话',
    'security.sessionsDescription': '以下是已登录您账户的设备。您可以撤销任何不识别的设备。',
    'security.revokeOthers': '注销其他所有设备',
    'security.currentSession': '当前设备',
    'security.revokeSession': '注销此设备',
    'security.noSessions': '无活跃会话。',
    'integrations.statusConnected': '已连接',
    'integrations.statusDisconnected': '未连接',
    'integrations.enabled': '已启用',
    'integrations.disabled': '已禁用',
    'integrations.addMoreHint': '需要自定义集成？请联系管理员注册新的应用程序。',
    'notifications.emailTitle': '邮件通知',
    'notifications.emailDescription': '将系统自动发送的通知推送到您的电子邮箱。',
    'notifications.securityAlerts': '安全警报',
    'notifications.securityAlertsDesc': '在密码修改、新登录尝试或生成 API 密钥时收到通知。',
    'notifications.activityLogs': '活动报告',
    'notifications.activityLogsDesc': '每周获取关于系统审计、资源修改和后台任务的摘要。',
    'notifications.systemAlerts': '系统报告',
    'notifications.systemAlertsDesc': '在服务器实例或数据流水线发生故障时接收实时通知。',
    'notifications.pushTitle': '应用内与浏览器推送',
    'notifications.pushDescription': '在当前打开的浏览器标签页上接收推送通知。',
    'notifications.securityPushDesc': '在检测到未经授权的登录时立即在浏览器发出警报。',
    'notifications.activityPushDesc': '当同事编辑资源时，即时接收操作日志推送。',
    'notifications.systemPushDesc': '针对任务队列和内存异常的严重警报。',
    'notifications.smsTitle': '短信紧急警报',
    'notifications.smsDescription': '可能产生标准资费。仅在需要管理员手动干预的紧急事件时使用。',
    'notifications.criticalSecurity': '关键安全事件',
    'notifications.criticalSecurityDesc': '在发生 Root 密码重置或双重身份验证绕过时发送短信警报。',
    'api.generateTitle': '创建新 API 密钥',
    'api.generateDesc': '配置权限范围并生成访问令牌。',
    'api.keyName': '密钥名称',
    'api.permissions': '权限范围',
    'api.generateButton': '生成令牌',
    'api.activeKeysTitle': '活跃 API 密钥',
    'api.activeKeysDesc': '请妥善保管这些密钥。切勿在公共仓库中分享。',
    'api.successTitle': 'API 密钥已生成',
    'api.successHint': '请立即复制此令牌。关闭此提示后，您将无法再次查看它。',
    'api.noKeys': '尚未生成活跃的 API 密钥。',
    'error.pageNotFoundDescription': '抱歉，您访问的页面不存在或已被移除。',
    'error.internalServerErrorDescription': '系统发生了一些问题，请稍后再试或联系支持人员。',
    'settings.system': '系统',
    'settings.themeMode': '主题模式',
    'settings.light': '浅色',
    'settings.dark': '深色',
    'settings.systemTheme': '跟随系统',
    'settings.colorAccent': '强调色',
    'settings.language': '语言',
    'settings.interface': '界面',
    'settings.sidebarDensity': '侧边栏密度',
    'settings.compact': '紧凑',
    'settings.standard': '标准',
    'settings.defaultPageSize': '默认每页条数',
    'settings.version': '版本',
    'settings.registeredResources': '已注册资源',
    'settings.dataProvider': '数据源',
    'settings.currentEnvironment': '当前环境',
    'settings.settingsDescription': '管理您的账户和界面偏好。',
    'settings.rolesAndPermissions': '角色与权限',
    'settings.roles': '角色',
    'settings.rolesDescription': '管理系统访问控制与资源权限。',
    'settings.rbacNotSupported': '当前数据源不支持 RBAC 管理',
    'settings.selectRoleHint': '请在左侧选择一个角色以查看权限',
    'settings.resource': '资源',
    'resource.posts': '文章',
    'resource.users': '用户',
    'resource.categories': '分类',
    // Audit
    'settings.auditLogs': '操作日志',
    'settings.auditDescription': '追踪和审查所有系统操作，用于合规与调试。',
    'settings.auditNotSupported': '当前数据源不支持操作日志',
    'settings.searchLogs': '搜索用户、操作或资源...',
    'settings.auditTime': '时间',
    'settings.auditUser': '操作人',
    'settings.auditAction': '操作',
    'settings.auditResource': '资源',
    'settings.auditIp': 'IP 地址',
    'settings.auditTotal': '条记录',
    'settings.auditSnapshot': '变更快照',
    // Editor
    'editor.bold': '加粗',
    'editor.italic': '斜体',
    'editor.underline': '下划线',
    'editor.strikethrough': '删除线',
    'editor.code': '行内代码',
    'editor.codeBlock': '代码块',
    'editor.h1': '一级标题',
    'editor.h2': '二级标题',
    'editor.h3': '三级标题',
    'editor.h4': '四级标题',
    'editor.bulletList': '无序列表',
    'editor.orderedList': '有序列表',
    'editor.taskList': '任务列表',
    'editor.blockquote': '引用',
    'editor.alignLeft': '左对齐',
    'editor.alignCenter': '居中对齐',
    'editor.alignRight': '右对齐',
    'editor.alignJustify': '两端对齐',
    'editor.link': '插入链接',
    'editor.image': '插入图片',
    'editor.table': '插入表格',
    'editor.color': '文本颜色',
    'editor.highlight': '高亮',
    'editor.clearFormat': '清除格式',
    'editor.undo': '撤销',
    'editor.redo': '重做',
    'editor.startWriting': '开始写作...',
    'editor.typeSlash': '输入 / 唤出菜单',
    // Editor - Popovers
    'editor.link.url': '链接地址',
    'editor.link.openInNewTab': '在新标签页打开',
    'editor.link.apply': '应用',
    'editor.link.remove': '移除链接',
    'editor.image.url': '图片链接 (URL)',
    'editor.image.upload': '点击或拖拽图片到此处上传',
    'editor.image.uploading': '上传中...',
    'editor.table.insertRowAbove': '在上方插入行',
    'editor.table.insertRowBelow': '在下方插入行',
    'editor.table.deleteRow': '删除行',
    'editor.table.insertColumnLeft': '在左侧插入列',
    'editor.table.insertColumnRight': '在右侧插入列',
    'editor.table.deleteColumn': '删除列',
    'editor.table.deleteTable': '删除表格',
    'editor.table.mergeCells': '合并/拆分单元格',
    // Profile
    'profile.title': '个人资料',
    'profile.name': '姓名',
    'profile.notAvailable': '无法获取资料',
    'profile.changePassword': '修改密码',
    'profile.currentPassword': '当前密码',
    'profile.passwordChanged': '密码已修改',
    'profile.updatePassword': '更新密码',
    'profile.newPassword': '新密码',
    'profile.company': '企业',
    'profile.gamer': '玩家',
    'profile.companyName': '公司名称',
    'profile.industry': '行业',
    'profile.website': '网站',
    'profile.employees': '员工',
    'profile.founded': '成立于',
    'profile.companyDescription': '公司介绍',
    'profile.level': '等级',
    'profile.gamesPlayed': '游戏场次',
    'profile.winRate': '胜率',
    'profile.rank': '段位',
    // Public profile
    'publicProfile.projects': '项目',
    'publicProfile.projects2Col': '两栏项目',
    'publicProfile.projects3Col': '三栏项目',
    'publicProfile.activity': '活动',
    'publicProfile.teams': '团队',
    'publicProfile.followers': '关注者',
    'publicProfile.following': '正在关注',
    'publicProfile.editProfile': '编辑资料',
    'publicProfile.sendMessage': '发送消息',
    'publicProfile.joinedDate': '{date} 加入',
    'publicProfile.noProjects': '暂无项目',
    'publicProfile.noActivity': '暂无活动',
    'publicProfile.noTeams': '暂无团队',
    'publicProfile.projectMembers': '{count} 名成员',
    'publicProfile.projectTasks': '{count} 个任务',
    'publicProfile.viewProfile': '查看资料',
    'publicProfile.activityPosted': '发布了动态',
    'publicProfile.activityCommented': '评论了',
    'publicProfile.activityJoined': '加入了',
    'publicProfile.activityCreated': '创建了',
    // Account demo pages
    'account.getStarted': '开始使用',
    'account.getStartedDescription': '按照步骤补齐资料、连接服务并邀请团队成员。',
    'account.uploadAvatar': '上传头像',
    'account.setupProfile': '完善个人资料',
    'account.connectProvider': '连接身份提供方',
    'account.setupTeam': '创建团队空间',
    'account.completeSetup': '完成设置',
    'account.skipSetup': '跳过',
    'account.step': '第 {current} / {total} 步',
    'account.companyProfile': '公司资料',
    'account.companyProfileDescription': '维护组织基础信息、行业属性和公开展示内容。',
    'account.settingsPlain': '纯净设置',
    'account.settingsPlainDescription': '以单页表单方式管理账号、安全与通知偏好。',
    'account.settingsSidebar': '侧边栏设置',
    'account.settingsSidebarDescription': '调整导航密度、默认折叠和菜单显示偏好。',
    'account.settingsEnterprise': '企业设置',
    'account.settingsEnterpriseDescription': '配置 SSO、会话策略、审计日志和合规保留周期。',
    'account.membersStarter': '成员入门',
    'account.membersStarterDescription': '快速邀请核心成员并检查初始角色配置。',
    'account.teamMembers': '团队成员',
    'account.teamMembersDescription': '按部门、角色、状态和最近活跃时间管理团队名册。',
    'account.inviteMember': '邀请成员',
    'account.active': '活跃',
    'account.invited': '已邀请',
    'account.inactive': '未活跃',
    'account.member': '成员',
    'account.role': '角色',
    'account.status': '状态',
    'account.joined': '加入时间',
    'account.importMembers': '导入成员',
    'account.importMembersDescription': '上传 CSV 或 Excel 文件，批量创建成员并预分配角色。',
    'account.importComplete': '导入完成',
    'account.imported': '已成功导入 {count} 位成员。',
    'account.dragOrClick': '拖拽文件到这里，或点击选择文件',
    'account.supportedFormats': '支持 CSV、XLSX，建议不超过 5MB。',
    'account.importProgress': '导入中',
    'account.startImport': '开始导入',
    'account.downloadTemplate': '下载模板',
    'account.securityLog': '安全日志',
    'account.securityLogDescription': '查看登录、密钥、2FA 和会话变更记录。',
    // Security log
    'securityLog.event': '事件',
    'securityLog.ip': 'IP 地址',
    'securityLog.device': '设备',
    'securityLog.location': '位置',
    'securityLog.time': '时间',
    'securityLog.loginSuccess': '登录成功',
    'securityLog.loginFailed': '登录失败',
    'securityLog.apiKeyCreated': '创建 API 密钥',
    'securityLog.apiKeyRevoked': '撤销 API 密钥',
    'securityLog.twoFactorEnabled': '启用两步验证',
    'securityLog.passwordChanged': '修改密码',
    'securityLog.sessionRevoked': '撤销会话',
    // Network
    'network.userCards': '用户卡片',
    'network.userCardsDescription': '以收藏卡片方式展示社区、资产和连接状态。',
    'network.teamCrew': '团队成员表',
    'network.teamCrewDescription': '用表格方式查看跨部门成员、在线状态和项目投入。',
    'network.nftCollection': '藏品',
    'network.floorPrice': '底价',
    'network.volume': '交易量',
    'network.connected': '已连接',
    'network.connect': '连接',
    // Two-factor authentication
    'auth.twoFactorSetup': '两步验证设置',
    'auth.twoFactorScanQR': '扫描二维码',
    'auth.twoFactorEnterCode': '输入验证码',
    'auth.twoFactorSaveRecovery': '保存恢复码',
    'auth.twoFactorRecoveryHint': '请把恢复码保存在安全位置，手机不可用时可以用它登录。',
    'auth.twoFactorVerify': '验证代码',
    'auth.twoFactorRecovery': '恢复码',
    'auth.twoFactorVerifySuccess': '两步验证已启用',
    'auth.twoFactorDisable': '停用两步验证',
    // Tasks
    'task.drawerTitle': '任务中心',
    'task.listTitle': '任务列表',
    'task.dlqTitle': '死信队列',
    'task.tabTasks': '任务',
    'task.tabDlq': '死信',
    'task.count': '{count} 个任务',
    'task.activeCount': '{count} 个进行中',
    'task.lastQueuedAt': '最近排队时间 {time}',
    'task.loadingList': '正在加载任务...',
    'task.loadingDetail': '正在加载任务详情...',
    'task.noTasks': '暂无任务',
    'task.noDlq': '暂无死信任务',
    'task.noSelection': '未选择任务',
    'task.selectHint': '从左侧选择一个任务查看详情',
    'task.taskColumn': '任务',
    'task.statusColumn': '状态',
    'task.updatedColumn': '更新时间',
    'task.actionsColumn': '操作',
    'task.detailsAction': '详情',
    'task.detailsTitle': '任务详情',
    'task.detailsSummary': '任务详情',
    'task.createdLabel': '创建时间',
    'task.updatedLabel': '更新时间',
    'task.messageLabel': '消息',
    'task.errorLabel': '错误',
    'task.payloadLabel': '负载',
    'task.resultLabel': '结果',
    'task.searchPlaceholder': '按名称、ID、状态或消息筛选任务...',
    'task.statusFilterLabel': '状态筛选',
    'task.statusAll': '全部状态',
    'task.autoRefreshLabel': '自动刷新',
    'task.refreshOff': '关闭',
    'task.refresh5s': '每 5 秒',
    'task.refresh15s': '每 15 秒',
    'task.refresh30s': '每 30 秒',
    'task.submitTitle': '提交任务',
    'task.submitDescription': '直接从任务中心提交一个新任务并跟踪执行状态。',
    'task.taskNameLabel': '任务名称',
    'task.idempotencyKeyLabel': '幂等键',
    'task.bodyLabel': '任务负载（JSON）',
    'task.bodyPlaceholder': '{\n  "prompt": "生成一张海报"\n}',
    'task.submitAction': '提交任务',
    'task.invalidJson': '任务负载必须是合法 JSON',
    'task.submitSuccess': '任务提交成功',
    'task.submitFailed': '任务提交失败',
    'task.fetchFailed': '加载任务失败',
    'task.fetchListFailed': '加载任务列表失败',
    'task.status.pending': '等待中',
    'task.status.queued': '已排队',
    'task.status.running': '执行中',
    'task.status.processing': '处理中',
    'task.status.completed': '已完成',
    'task.status.success': '成功',
    'task.status.done': '已完成',
    'task.status.failed': '失败',
    'task.status.error': '错误',
    'task.status.cancelled': '已取消',
    'task.status.canceled': '已取消',
    'task.status.succeeded': '已完成',
    'task.status.dead_lettered': '死信',
    'task.status.retry_scheduled': '等待重试',
    'task.status.leased': '已领取',
    // Profile sections
    'profileSections.about': '关于',
    'profileSections.workExperience': '工作经历',
    'profileSections.skills': '技能',
    'profileSections.communityBadges': '社区徽章',
    'profileSections.recentUploads': '最近上传',
    'profileSections.contributors': '贡献者',
    'profileSections.projects': '项目',
    'profileSections.projectName': '项目名称',
    'profileSections.progress': '进度',
    'profileSections.people': '成员',
    'profileSections.dueDate': '截止日期',
    'profileSections.highlights': '亮点',
    'profileSections.openJobs': '在招职位',
    'profileSections.locations': '办公地点',
    'profileSections.members': '成员',
    'profileSections.investments': '投资动态',
    'profileSections.favoriteGames': '常玩游戏',
    'profileSections.tournaments': '锦标赛',
    'profileSections.nowPlaying': '正在玩',
    'profileSections.network': '人脉',
    'profileSections.viewAll': '查看全部',
    'profileSections.present': '至今',
    // Account: user profile page
    'account.userProfile': '用户资料',
    'account.userProfileDescription': '集中管理个人信息、工作方式、徽章与常用文件。',
    'account.personalInfo': '个人信息',
    'account.work': '工作',
    'account.badges': '徽章',
    'account.connections': '连接',
    'account.myFiles': '我的文件',
    'account.calendarAccounts': '日历账户',
    'account.availableNow': '当前可接单',
    // Account: settings shared
    'account.photo': '头像',
    'account.phone': '手机号码',
    'account.dateOfBirth': '出生日期',
    'account.bio': '个人简介',
    'account.address': '地址',
    'account.country': '国家/地区',
    'account.state': '省/州',
    'account.city': '城市',
    'account.postcode': '邮编',
    'account.password': '密码',
    'account.deleteAccount': '注销账户',
    'account.deleteAccountDescription': '永久删除账户及全部数据，此操作不可撤销。',
    'account.confirmDeleteAccount': '确认注销账户',
    'account.basicSettings': '基础设置',
    'account.visibility': '资料可见性',
    'account.availability': '接单状态',
    'account.availableToHire': '可接受合作',
    'account.socialSignIn': '社交账号登录',
    'account.twoFactorAuth': '两步验证 (2FA)',
    'account.singleSignOn': '单点登录 (SSO)',
    'account.preferences': '偏好设置',
    'account.language': '语言',
    'account.timezone': '时区',
    'account.currency': '货币',
    'account.manageApi': 'API 管理',
    'account.publicProfileCard': '公开资料',
    'account.branding': '品牌设置',
    'account.dataImport': '数据导入',
    'account.dataImportDescription': '从第三方分析平台导入历史数据。',
    'account.trustedDevices': '受信任设备',
    'account.currentPlan': '当前套餐',
    'account.paymentHistory': '支付记录',
    'account.date': '日期',
    'account.type': '类型',
    'account.amount': '金额',
    'account.invitePeople': '邀请成员',
    'account.inviteWithLink': '通过链接邀请',
    'account.copyLink': '复制链接',
    'account.sendInvite': '发送邀请',
    // Notifications page sections
    'notifications.channels': '通知渠道',
    'notifications.teamWideAlerts': '团队广播',
    'notifications.otherNotifications': '其他通知',
    'notifications.doNotDisturb': '勿扰模式',
    'notifications.doNotDisturbDesc': '开启后暂停所有非关键通知。',
    // API page sections
    'api.publicKey': '公开 API 密钥',
    'api.publicKeyDesc': '用于客户端集成的公开密钥，可随时重新生成。',
    'api.regenerate': '重新生成',
    'api.webhooks': 'Webhooks',
    'api.webhooksDesc': '配置事件回调地址，实时接收系统事件。',
    'api.webhookUrl': 'Webhook 地址',
    'api.addWebhook': '添加 Webhook',
    // Integrations page
    'integrations.addNew': '添加新集成',
    'integrations.addNewDesc': '浏览集成目录，连接更多第三方服务。',
    'integrations.browse': '浏览目录',
    // Appearance page
    'settings.transparentSidebar': '透明侧边栏',
    'settings.transparentSidebarDesc': '让侧边栏背景与页面内容融合。',
    'settings.branding': '品牌',
    'settings.disableDefaultBranding': '隐藏默认品牌标识',
    // Profile grids
    'publicProfile.projectsCount': '{count} 个项目',
    'publicProfile.teamsCount': '{count} 个团队',
    'publicProfile.searchProjects': '搜索项目...',
    'publicProfile.searchTeams': '搜索团队...',
    'publicProfile.autoRefresh': '自动刷新',
    'publicProfile.join': '加入',
    'publicProfile.rating': '评分',
    // Network pages
    'network.showingUsers': '展示 {count} 位用户',
    'network.showingUsersOf': '显示 {shown} / {total} 位用户',
    'account.department': '部门',
    'account.teamMembersCount': '团队成员（{count}）',
    'account.invitePeopleDescription': '通过邮件邀请新成员并预分配角色。',
    'account.inviteLinkHint': '任何获得该链接的人都可以申请加入团队。',
    // Import members options
    'account.importOptions': '导入选项',
    'account.importCreateUsers': '创建新用户',
    'account.importUpdateUsers': '更新已有用户',
    'account.importNotifyPassword': '密码变更时发送邮件通知',
    'account.importExternalIds': '在导入结果中包含外部 ID',
    'account.importWelcomeEmail': '向新用户发送欢迎邮件',
    // Enterprise settings
    'account.ssoDescription': '配置企业身份提供商以实现统一登录体验。',
    'account.enableSso': '启用 SSO',
    'account.enableSsoDesc': '允许员工通过企业 IdP 登录。',
    'account.ssoProvider': 'SSO 提供商',
    'account.domainRestriction': '域名限制',
    'account.securityPolicy': '安全策略',
    'account.passwordPolicy': '密码策略',
    'account.policyBasic': '基本',
    'account.policyStrong': '强密码',
    'account.policyVeryStrong': '非常强',
    'account.sessionTimeout': '会话超时（分钟）',
    'account.ipWhitelist': 'IP 白名单',
    'account.ipWhitelistHint': '留空表示不限制 IP。',
    'account.dataCompliance': '数据与合规',
    'account.auditLogging': '审计日志',
    'account.auditLoggingDesc': '记录所有管理操作以备合规审查。',
    'account.dataRetention': '数据保留天数',
    'account.perMonth': '/ 月',
    'account.currentDevice': '当前设备',
    // Profile variant extras
    'profileSections.recentActivity': '最近动态',
    'profileSections.team': '团队成员',
    // API webhooks extras
    'api.webhookName': 'Webhook 名称',
    'api.eventType': '事件类型',
    'api.noWebhooks': '尚未配置 Webhook。',
    'common.on': '开',
    'common.off': '关',
  },
  'en': {
    'common.list': 'List',
    'common.prev': 'Prev',
    'common.pageOf': 'Page {page} of {total}',
    'common.areYouSure': 'Are you sure?',
    'common.backToList': 'Back to List',
    'common.refresh': 'Refresh',
    'common.importData': 'Import data',
    'common.upload': 'Upload',
    'common.returnHome': 'Return to Home',
    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.create': 'Create',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.batchDeletePartialFail': 'Batch delete partially failed: {failed}/{total} unsuccessful',
    'common.batchDeleteSuccess': 'Successfully deleted {count} records',
    'common.search': 'Search...',
    'common.confirm': 'Confirm',
    'common.loading': 'Loading...',
    'common.noData': 'No data',
    'common.noDataHint': 'No data available, create your first record to get started.',
    'common.actions': 'Actions',
    'common.total': 'Total: {total}',
    'common.page': '{current} / {total}',
    'common.export': 'Export',
    'common.import': 'Import',
    'common.clone': 'Clone',
    'common.autoSaving': 'Auto-saving...',
    'common.autoSaved': 'Saved',
    'common.selectAll': 'Select All',
    'common.batchDelete': 'Batch Delete ({count})',
    'common.unsavedChanges': 'You have unsaved changes. Leave anyway?',
    'common.unsaved': 'Unsaved',
    'common.deleteConfirm': 'Are you sure you want to delete this record? This cannot be undone.',
    'common.batchDeleteConfirm': 'Delete {count} selected records? This cannot be undone.',
    'common.confirmAction': 'Confirm Action',
    'common.operationSuccess': 'Operation successful',
    'common.operationFailed': 'Operation failed',
    'common.createSuccess': 'Created successfully',
    'common.updateSuccess': 'Updated successfully',
    'common.deleteSuccess': 'Deleted successfully',
    'common.loginFailed': 'Login failed',
    'common.home': 'Home',
    'common.logout': 'Log out',
    'common.toggleTheme': 'Toggle theme',
    'common.switchLanguage': 'Switch language',
    'common.goToSite': 'Go to Workspace',
    'common.clear': 'Clear',
    'common.menu': 'Menu',
    'common.darkMode': 'Dark mode',
    'common.lightMode': 'Light mode',
    'common.detail': 'Detail',
    'common.show': 'Show',
    'common.loadFailed': 'Load failed: {message}',
    'common.pageNotFound': 'Page not found',
    'common.error': 'Something went wrong',
    'common.retry': 'Retry',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.undo': 'Undo',
    'common.filter': 'Filter',
    'common.reset': 'Reset',
    'common.welcome': 'Welcome to {title}',
    'common.dashboardHint': 'Select a resource from the sidebar to get started.',
    'common.redirecting': 'Redirecting to login...',
    'common.expand': 'Expand',
    'common.collapse': 'Collapse',
    'common.close': 'Close',
    'common.copy': 'Copy',
    'common.copyAll': 'Copy All',
    'common.copied': 'Copied!',
    'common.next': 'Next',
    'common.back': 'Back',
    'common.step': 'Step',
    'common.columns': 'Columns',
    'common.perPage': 'per page',
    'common.copyId': 'Copy ID',
    'common.showMore': 'Show more',
    'common.showLess': 'Show less',
    'common.showPassword': 'Show password',
    'common.hidePassword': 'Hide password',
    'common.toggleSidebar': 'Toggle sidebar',
    'common.configRequired': 'Configuration Required',
    'common.removeImage': 'Remove image',
    // Field
    'field.enterValue': 'Enter {label}',
    'field.selectPlaceholder': 'Select...',
    'field.tagsPlaceholder': 'Type a tag and press Enter...',
    'field.noOptions': 'No options available',
    'field.addImage': 'Add image',
    // Config errors
    'config.missingEnvTitle': 'Missing Configuration',
    'config.missingEnvDescription': 'The app cannot start because required environment variables are missing.',
    'config.addToEnvFile': 'Add the following to your .env file:',
    'config.envFilePath': 'File path: .env',
    'config.reload': 'Refresh page after configuration',
    'config.reloadButton': 'Reload Page',
    // Auth pages
    'auth.login': 'Login',
    'auth.register': 'Register',
    'auth.forgotPassword': 'Forgot Password',
    'auth.resetPassword': 'Reset Password',
    'auth.email': 'Email',
    'auth.usernameOrEmail': 'Username or Email',
    'auth.usernameOrEmailRequired': 'Username or Email is required',
    'auth.identifierPlaceholder': 'username or name@example.com',
    'auth.password': 'Password',
    'auth.confirmPassword': 'Confirm Password',
    'auth.rememberMe': 'Remember me',
    'auth.loginButton': 'Sign In',
    'auth.registerButton': 'Sign Up',
    'auth.sendResetLink': 'Send Reset Link',
    'auth.backToLogin': 'Back to Login',
    'auth.noAccount': "Don't have an account?",
    'auth.hasAccount': 'Already have an account?',
    'auth.forgotPasswordLink': 'Forgot password?',
    'auth.forgotPasswordDescription': 'Enter your email address and we will send you a reset link.',
    'auth.resetPasswordDescription': 'Set a new sign-in password.',
    'auth.resetLinkSent': 'Reset link sent! Check your email.',
    'auth.passwordMismatch': 'Passwords do not match',
    'auth.emailRequired': 'Email is required',
    'auth.passwordRequired': 'Password is required',
    'auth.registerSuccess': 'Registration successful',
    'auth.welcomeBack': 'Welcome Back',
    'auth.welcomeMessage': 'Sign in to continue to admin panel',
    'auth.createAccount': 'Create Account',
    'auth.createAccountMessage': 'Fill in your details to create an account',
    // AutoSave
    'autoSave.idle': 'Saved',
    'autoSave.saving': 'Saving...',
    'autoSave.saved': 'Saved',
    'autoSave.error': 'Save failed',
    // Empty states
    'empty.title': 'No data',
    'empty.description': 'No records found matching your criteria.',
    'empty.noMore': 'No more items',
    // DevTools
    'devtools.title': 'DevTools (Ctrl+Shift+D)',
    // Validation
    // Chat
    'chat.title': 'AI Assistant',
    'chat.contextInfo': 'Current context: {resource}',
    'chat.actionButton': 'Execute',
    'chat.historyRestored': 'Chat history restored',
    'chat.historyClear': 'Chat history cleared',
    // Validation
    'validation.required': 'This field is required',
    'validation.minLength': 'Minimum {min} characters',
    'validation.maxLength': 'Maximum {max} characters',
    'validation.invalidEmail': 'Please enter a valid email address',
    'validation.invalidUrl': 'Please enter a valid URL',
    'validation.invalidNumber': 'Please enter a valid number',
    'validation.invalidFormat': 'Invalid format',
    // Settings
    'settings.title': 'Settings',
    'settings.profile': 'Profile',
    'settings.appearance': 'Appearance',
    'settings.about': 'About',
    'settings.general': 'General',
    'settings.security': 'Security',
    'settings.integrations': 'Integrations',
    'settings.notifications': 'Notifications',
    'settings.api': 'API Settings',
    'settings.developer': 'Developer',
    'settings.workspace': 'Workspace',
    'settings.securityDescription': 'Manage your password, active sessions, and multi-factor authentication preferences.',
    'settings.integrationsDescription': 'Connect and manage third-party service extensions for your workspace.',
    'settings.notificationsDescription': 'Configure how and when you receive system alerts.',
    'settings.apiDescription': 'Generate and manage secure API keys to integrate external programmatic scripts.',
    'security.twoFactorAuth': 'Two-Factor Authentication (2FA)',
    'security.twoFactorDescription': 'Add an extra layer of security to your account by requiring a verification code in addition to your password.',
    'security.enable2fa': 'Enable 2FA Verification',
    'security.twoFactorActive': '2FA is currently active. Verification codes will be required on new logins.',
    'security.twoFactorInactive': '2FA is currently disabled. Protect your account by turning it on.',
    'security.passwordLastChanged': 'Last changed: {time}',
    'security.activeSessions': 'Active Sessions',
    'security.sessionsDescription': 'These are the devices that have logged into your account. Revoke any you do not recognize.',
    'security.revokeOthers': 'Sign Out Other Devices',
    'security.currentSession': 'Current Device',
    'security.revokeSession': 'Sign out device',
    'security.noSessions': 'No active sessions.',
    'integrations.statusConnected': 'Connected',
    'integrations.statusDisconnected': 'Disconnected',
    'integrations.enabled': 'Enabled',
    'integrations.disabled': 'Disabled',
    'integrations.addMoreHint': 'Need custom integrations? Contact your administrator to register new application manifests.',
    'notifications.emailTitle': 'Email Notifications',
    'notifications.emailDescription': 'Get automated system messages delivered directly to your mailbox.',
    'notifications.securityAlerts': 'Security Alerts',
    'notifications.securityAlertsDesc': 'Get notified of password changes, login attempts, and key generations.',
    'notifications.activityLogs': 'Activity Reports',
    'notifications.activityLogsDesc': 'Weekly summaries of system audits, modifications, and background tasks.',
    'notifications.systemAlerts': 'System Reports',
    'notifications.systemAlertsDesc': 'Real-time alerts when server instances or data pipelines fail.',
    'notifications.pushTitle': 'In-App & Push Notifications',
    'notifications.pushDescription': 'Receive push notifications on your active browser tab.',
    'notifications.securityPushDesc': 'Immediate browser alerts on unauthorized login detection.',
    'notifications.activityPushDesc': 'Instant notifications on CRUD logs when colleagues edit resources.',
    'notifications.systemPushDesc': 'Critical alerts for task queues and memory anomalies.',
    'notifications.smsTitle': 'SMS Emergency Alerts',
    'notifications.smsDescription': 'Standard rates apply. Used only for urgent events requiring manual administrator intervention.',
    'notifications.criticalSecurity': 'Critical Security Events',
    'notifications.criticalSecurityDesc': 'SMS alert sent when root password resets or 2FA bypass occurs.',
    'api.generateTitle': 'Create New API Key',
    'api.generateDesc': 'Configure scopes and generate a token.',
    'api.keyName': 'Key Name',
    'api.permissions': 'Permissions',
    'api.generateButton': 'Generate Token',
    'api.activeKeysTitle': 'Active API Keys',
    'api.activeKeysDesc': 'Keep these keys secure. Do not share them in public repositories.',
    'api.successTitle': 'API Key Generated',
    'api.successHint': 'Copy this token now. It will not be shown again.',
    'api.noKeys': 'No active API keys generated yet.',
    'error.pageNotFoundDescription': 'Sorry, the page you are looking for does not exist or has been moved.',
    'error.internalServerErrorDescription': 'Something went wrong on our end. Please try again later or contact support.',
    'settings.system': 'System',
    'settings.themeMode': 'Theme Mode',
    'settings.light': 'Light',
    'settings.dark': 'Dark',
    'settings.systemTheme': 'System',
    'settings.colorAccent': 'Color Accent',
    'settings.language': 'Language',
    'settings.interface': 'Interface',
    'settings.sidebarDensity': 'Sidebar Density',
    'settings.compact': 'Compact',
    'settings.standard': 'Standard',
    'settings.defaultPageSize': 'Default Page Size',
    'settings.version': 'Version',
    'settings.registeredResources': 'Registered Resources',
    'settings.dataProvider': 'Data Provider',
    'settings.currentEnvironment': 'Current Environment',
    'settings.settingsDescription': 'Manage your account and interface preferences.',
    'settings.rolesAndPermissions': 'Roles & Permissions',
    'settings.roles': 'Roles',
    'settings.rolesDescription': 'Manage system access control and resource permissions.',
    'settings.rbacNotSupported': 'RBAC management is not supported by the current data provider',
    'settings.selectRoleHint': 'Select a role on the left to view permissions',
    'settings.resource': 'Resource',
    'resource.posts': 'Posts',
    'resource.users': 'Users',
    'resource.categories': 'Categories',
    // Audit
    'settings.auditLogs': 'Audit Logs',
    'settings.auditDescription': 'Track and review all system operations for compliance and debugging.',
    'settings.auditNotSupported': 'Audit logs are not supported by the current data provider',
    'settings.searchLogs': 'Search by user, action, or resource...',
    'settings.auditTime': 'Time',
    'settings.auditUser': 'User',
    'settings.auditAction': 'Action',
    'settings.auditResource': 'Resource',
    'settings.auditIp': 'IP Address',
    'settings.auditTotal': 'total records',
    'settings.auditSnapshot': 'Change Snapshot',
    // Editor
    'editor.bold': 'Bold',
    'editor.italic': 'Italic',
    'editor.underline': 'Underline',
    'editor.strikethrough': 'Strikethrough',
    'editor.code': 'Inline Code',
    'editor.codeBlock': 'Code Block',
    'editor.h1': 'Heading 1',
    'editor.h2': 'Heading 2',
    'editor.h3': 'Heading 3',
    'editor.h4': 'Heading 4',
    'editor.bulletList': 'Bullet List',
    'editor.orderedList': 'Ordered List',
    'editor.taskList': 'Task List',
    'editor.blockquote': 'Blockquote',
    'editor.alignLeft': 'Align Left',
    'editor.alignCenter': 'Align Center',
    'editor.alignRight': 'Align Right',
    'editor.alignJustify': 'Justify',
    'editor.link': 'Insert Link',
    'editor.image': 'Insert Image',
    'editor.table': 'Insert Table',
    'editor.color': 'Text Color',
    'editor.highlight': 'Highlight',
    'editor.clearFormat': 'Clear Formatting',
    'editor.undo': 'Undo',
    'editor.redo': 'Redo',
    'editor.startWriting': 'Start writing...',
    'editor.typeSlash': 'Type / for commands',
    // Editor - Popovers
    'editor.link.url': 'Link URL',
    'editor.link.openInNewTab': 'Open in new tab',
    'editor.link.apply': 'Apply',
    'editor.link.remove': 'Remove Link',
    'editor.image.url': 'Image URL',
    'editor.image.upload': 'Click or drag image here to upload',
    'editor.image.uploading': 'Uploading...',
    'editor.table.insertRowAbove': 'Insert row above',
    'editor.table.insertRowBelow': 'Insert row below',
    'editor.table.deleteRow': 'Delete row',
    'editor.table.insertColumnLeft': 'Insert column left',
    'editor.table.insertColumnRight': 'Insert column right',
    'editor.table.deleteColumn': 'Delete column',
    'editor.table.deleteTable': 'Delete table',
    'editor.table.mergeCells': 'Toggle merge cells',
    // Profile
    'profile.title': 'Profile',
    'profile.name': 'Name',
    'profile.notAvailable': 'Profile not available',
    'profile.changePassword': 'Change Password',
    'profile.currentPassword': 'Current Password',
    'profile.passwordChanged': 'Password updated successfully',
    'profile.updatePassword': 'Update Password',
    'profile.newPassword': 'New Password',
    'profile.company': 'Company',
    'profile.gamer': 'Gamer',
    'profile.companyName': 'Company Name',
    'profile.industry': 'Industry',
    'profile.website': 'Website',
    'profile.employees': 'Employees',
    'profile.founded': 'Founded',
    'profile.companyDescription': 'Company Description',
    'profile.level': 'Level',
    'profile.gamesPlayed': 'Games Played',
    'profile.winRate': 'Win Rate',
    'profile.rank': 'Rank',
    // Public profile
    'publicProfile.projects': 'Projects',
    'publicProfile.projects2Col': 'Projects - 2 Columns',
    'publicProfile.projects3Col': 'Projects - 3 Columns',
    'publicProfile.activity': 'Activity',
    'publicProfile.teams': 'Teams',
    'publicProfile.followers': 'Followers',
    'publicProfile.following': 'Following',
    'publicProfile.editProfile': 'Edit Profile',
    'publicProfile.sendMessage': 'Send Message',
    'publicProfile.joinedDate': 'Joined {date}',
    'publicProfile.noProjects': 'No projects yet',
    'publicProfile.noActivity': 'No activity yet',
    'publicProfile.noTeams': 'No teams yet',
    'publicProfile.projectMembers': '{count} members',
    'publicProfile.projectTasks': '{count} tasks',
    'publicProfile.viewProfile': 'View Profile',
    'publicProfile.activityPosted': 'posted',
    'publicProfile.activityCommented': 'commented on',
    'publicProfile.activityJoined': 'joined',
    'publicProfile.activityCreated': 'created',
    // Account demo pages
    'account.getStarted': 'Get Started',
    'account.getStartedDescription': 'Complete profile basics, connect services, and invite your team.',
    'account.uploadAvatar': 'Upload Avatar',
    'account.setupProfile': 'Set Up Profile',
    'account.connectProvider': 'Connect Identity Provider',
    'account.setupTeam': 'Set Up Team',
    'account.completeSetup': 'Complete Setup',
    'account.skipSetup': 'Skip',
    'account.step': 'Step {current} of {total}',
    'account.companyProfile': 'Company Profile',
    'account.companyProfileDescription': 'Maintain organization details, industry fields, and public profile content.',
    'account.settingsPlain': 'Settings - Plain',
    'account.settingsPlainDescription': 'Manage account, security, and notification preferences in one page.',
    'account.settingsSidebar': 'Settings - Sidebar',
    'account.settingsSidebarDescription': 'Adjust navigation density, default collapse, and menu display preferences.',
    'account.settingsEnterprise': 'Enterprise Settings',
    'account.settingsEnterpriseDescription': 'Configure SSO, session policy, audit logs, and compliance retention.',
    'account.membersStarter': 'Members Starter',
    'account.membersStarterDescription': 'Invite core members and check initial role setup.',
    'account.teamMembers': 'Team Members',
    'account.teamMembersDescription': 'Manage the team roster by department, role, status, and recent activity.',
    'account.inviteMember': 'Invite Member',
    'account.active': 'Active',
    'account.invited': 'Invited',
    'account.inactive': 'Inactive',
    'account.member': 'Member',
    'account.role': 'Role',
    'account.status': 'Status',
    'account.joined': 'Joined',
    'account.importMembers': 'Import Members',
    'account.importMembersDescription': 'Upload a CSV or Excel file to create members and pre-assign roles in bulk.',
    'account.importComplete': 'Import Complete',
    'account.imported': 'Imported {count} members successfully.',
    'account.dragOrClick': 'Drag a file here, or click to select one',
    'account.supportedFormats': 'CSV and XLSX supported, up to 5MB recommended.',
    'account.importProgress': 'Importing',
    'account.startImport': 'Start Import',
    'account.downloadTemplate': 'Download Template',
    'account.securityLog': 'Security Log',
    'account.securityLogDescription': 'Review login, key, 2FA, and session change events.',
    // Security log
    'securityLog.event': 'Event',
    'securityLog.ip': 'IP Address',
    'securityLog.device': 'Device',
    'securityLog.location': 'Location',
    'securityLog.time': 'Time',
    'securityLog.loginSuccess': 'Login successful',
    'securityLog.loginFailed': 'Login failed',
    'securityLog.apiKeyCreated': 'API key created',
    'securityLog.apiKeyRevoked': 'API key revoked',
    'securityLog.twoFactorEnabled': 'Two-factor authentication enabled',
    'securityLog.passwordChanged': 'Password changed',
    'securityLog.sessionRevoked': 'Session revoked',
    // Network
    'network.userCards': 'User Cards',
    'network.userCardsDescription': 'Showcase community profiles, asset collections, and connection status.',
    'network.teamCrew': 'Team Crew',
    'network.teamCrewDescription': 'Review cross-functional members, presence, and project commitment in a table.',
    'network.nftCollection': 'Collection',
    'network.floorPrice': 'Floor Price',
    'network.volume': 'Volume',
    'network.connected': 'Connected',
    'network.connect': 'Connect',
    // Two-factor authentication
    'auth.twoFactorSetup': 'Two-Factor Authentication Setup',
    'auth.twoFactorScanQR': 'Scan QR Code',
    'auth.twoFactorEnterCode': 'Enter Verification Code',
    'auth.twoFactorSaveRecovery': 'Save Recovery Codes',
    'auth.twoFactorRecoveryHint': 'Keep recovery codes somewhere safe so you can sign in if your device is unavailable.',
    'auth.twoFactorVerify': 'Verify Code',
    'auth.twoFactorRecovery': 'Recovery Codes',
    'auth.twoFactorVerifySuccess': 'Two-factor authentication is enabled',
    'auth.twoFactorDisable': 'Disable Two-Factor Authentication',
    // Tasks
    'task.drawerTitle': 'Task Center',
    'task.listTitle': 'Tasks',
    'task.dlqTitle': 'Dead Letter Queue',
    'task.tabTasks': 'Tasks',
    'task.tabDlq': 'DLQ',
    'task.count': '{count} task(s)',
    'task.activeCount': '{count} active',
    'task.lastQueuedAt': 'Last queued at {time}',
    'task.loadingList': 'Loading tasks...',
    'task.loadingDetail': 'Loading task...',
    'task.noTasks': 'No tasks found',
    'task.noDlq': 'No dead-letter tasks',
    'task.noSelection': 'No task selected',
    'task.selectHint': 'Select a task from the list to inspect details',
    'task.taskColumn': 'Task',
    'task.statusColumn': 'Status',
    'task.updatedColumn': 'Updated',
    'task.actionsColumn': 'Actions',
    'task.detailsAction': 'Details',
    'task.detailsTitle': 'Task Details',
    'task.detailsSummary': 'Task details',
    'task.createdLabel': 'Created',
    'task.updatedLabel': 'Updated',
    'task.messageLabel': 'Message',
    'task.errorLabel': 'Error',
    'task.payloadLabel': 'Payload',
    'task.resultLabel': 'Result',
    'task.searchPlaceholder': 'Filter tasks by name, ID, status, or message...',
    'task.statusFilterLabel': 'Status filter',
    'task.statusAll': 'All statuses',
    'task.autoRefreshLabel': 'Auto refresh',
    'task.refreshOff': 'Off',
    'task.refresh5s': 'Every 5s',
    'task.refresh15s': 'Every 15s',
    'task.refresh30s': 'Every 30s',
    'task.submitTitle': 'Submit Task',
    'task.submitDescription': 'Submit a new task from the drawer and follow it through completion.',
    'task.taskNameLabel': 'Task name',
    'task.idempotencyKeyLabel': 'Idempotency key',
    'task.bodyLabel': 'Task payload (JSON)',
    'task.bodyPlaceholder': '{\n  "prompt": "Generate a poster"\n}',
    'task.submitAction': 'Submit Task',
    'task.invalidJson': 'Task payload must be valid JSON',
    'task.submitSuccess': 'Task submitted successfully',
    'task.submitFailed': 'Task submission failed',
    'task.fetchFailed': 'Fetch task failed',
    'task.fetchListFailed': 'Fetch tasks failed',
    'task.status.pending': 'Pending',
    'task.status.queued': 'Queued',
    'task.status.running': 'Running',
    'task.status.processing': 'Processing',
    'task.status.completed': 'Completed',
    'task.status.success': 'Success',
    'task.status.done': 'Done',
    'task.status.failed': 'Failed',
    'task.status.error': 'Error',
    'task.status.cancelled': 'Cancelled',
    'task.status.canceled': 'Canceled',
    'task.status.succeeded': 'Succeeded',
    'task.status.dead_lettered': 'Dead lettered',
    'task.status.retry_scheduled': 'Retry scheduled',
    'task.status.leased': 'Leased',
    // Profile sections
    'profileSections.about': 'About',
    'profileSections.workExperience': 'Work Experience',
    'profileSections.skills': 'Skills',
    'profileSections.communityBadges': 'Community Badges',
    'profileSections.recentUploads': 'Recent Uploads',
    'profileSections.contributors': 'Contributors',
    'profileSections.projects': 'Projects',
    'profileSections.projectName': 'Project Name',
    'profileSections.progress': 'Progress',
    'profileSections.people': 'People',
    'profileSections.dueDate': 'Due Date',
    'profileSections.highlights': 'Highlights',
    'profileSections.openJobs': 'Open Jobs',
    'profileSections.locations': 'Locations',
    'profileSections.members': 'Members',
    'profileSections.investments': 'Investments',
    'profileSections.favoriteGames': 'Favorite Games',
    'profileSections.tournaments': 'Tournaments',
    'profileSections.nowPlaying': 'Now Playing',
    'profileSections.network': 'Network',
    'profileSections.viewAll': 'View All',
    'profileSections.present': 'Present',
    // Account: user profile page
    'account.userProfile': 'User Profile',
    'account.userProfileDescription': 'Manage personal info, work preferences, badges and files in one place.',
    'account.personalInfo': 'Personal Info',
    'account.work': 'Work',
    'account.badges': 'Badges',
    'account.connections': 'Connections',
    'account.myFiles': 'My Files',
    'account.calendarAccounts': 'Calendar Accounts',
    'account.availableNow': 'Available now',
    // Account: settings shared
    'account.photo': 'Photo',
    'account.phone': 'Phone number',
    'account.dateOfBirth': 'Date of Birth',
    'account.bio': 'Bio',
    'account.address': 'Address',
    'account.country': 'Country',
    'account.state': 'State',
    'account.city': 'City',
    'account.postcode': 'Postcode',
    'account.password': 'Password',
    'account.deleteAccount': 'Delete Account',
    'account.deleteAccountDescription': 'Permanently remove this account and all of its data. This cannot be undone.',
    'account.confirmDeleteAccount': 'Confirm deleting account',
    'account.basicSettings': 'Basic Settings',
    'account.visibility': 'Visibility',
    'account.availability': 'Availability',
    'account.availableToHire': 'Available to hire',
    'account.socialSignIn': 'Social Sign in',
    'account.twoFactorAuth': 'Two-Factor authentication (2FA)',
    'account.singleSignOn': 'Single Sign On (SSO)',
    'account.preferences': 'Preferences',
    'account.language': 'Language',
    'account.timezone': 'Time zone',
    'account.currency': 'Currency',
    'account.manageApi': 'Manage API',
    'account.publicProfileCard': 'Public Profile',
    'account.branding': 'Branding',
    'account.dataImport': 'Data import',
    'account.dataImportDescription': 'Import historical data from third-party analytics platforms.',
    'account.trustedDevices': 'Trusted Devices',
    'account.currentPlan': 'Your Current Plan',
    'account.paymentHistory': 'Payment History',
    'account.date': 'Date',
    'account.type': 'Type',
    'account.amount': 'Amount',
    'account.invitePeople': 'Invite People',
    'account.inviteWithLink': 'Invite with Link',
    'account.copyLink': 'Copy Link',
    'account.sendInvite': 'Send Invite',
    // Notifications page sections
    'notifications.channels': 'Notification Channels',
    'notifications.teamWideAlerts': 'Team-Wide Alerts',
    'notifications.otherNotifications': 'Other Notifications',
    'notifications.doNotDisturb': 'Do Not Disturb',
    'notifications.doNotDisturbDesc': 'Pause all non-critical notifications while enabled.',
    // API page sections
    'api.publicKey': 'Public API Key',
    'api.publicKeyDesc': 'Publishable key for client-side integrations. Regenerate anytime.',
    'api.regenerate': 'Regenerate',
    'api.webhooks': 'Webhooks',
    'api.webhooksDesc': 'Configure event callbacks to receive system events in real time.',
    'api.webhookUrl': 'Webhook URL',
    'api.addWebhook': 'Add Webhook',
    // Integrations page
    'integrations.addNew': 'Add New Integration',
    'integrations.addNewDesc': 'Browse the integration catalog and connect more services.',
    'integrations.browse': 'Browse Catalog',
    // Appearance page
    'settings.transparentSidebar': 'Transparent sidebar',
    'settings.transparentSidebarDesc': 'Blend the sidebar background with page content.',
    'settings.branding': 'Branding',
    'settings.disableDefaultBranding': 'Disable default branding',
    // Profile grids
    'publicProfile.projectsCount': '{count} Projects',
    'publicProfile.teamsCount': '{count} Teams',
    'publicProfile.searchProjects': 'Search projects...',
    'publicProfile.searchTeams': 'Search teams...',
    'publicProfile.autoRefresh': 'Auto refresh',
    'publicProfile.join': 'Join',
    'publicProfile.rating': 'Rating',
    // Network pages
    'network.showingUsers': 'Showing {count} Users',
    'network.showingUsersOf': 'Showing {shown} of {total} users',
    'account.department': 'Department',
    'account.teamMembersCount': 'Team Members ({count})',
    'account.invitePeopleDescription': 'Invite new members by email and pre-assign roles.',
    'account.inviteLinkHint': 'Anyone with this link can request to join the team.',
    // Import members options
    'account.importOptions': 'Import Options',
    'account.importCreateUsers': 'Create new users',
    'account.importUpdateUsers': 'Update existing users',
    'account.importNotifyPassword': 'Send email notification on password change',
    'account.importExternalIds': 'Include external IDs in import results',
    'account.importWelcomeEmail': 'Send welcome email to new users',
    // Enterprise settings
    'account.ssoDescription': 'Configure your enterprise identity provider for a unified sign-in experience.',
    'account.enableSso': 'Enable SSO',
    'account.enableSsoDesc': 'Allow employees to sign in with your enterprise IdP.',
    'account.ssoProvider': 'SSO Provider',
    'account.domainRestriction': 'Domain Restriction',
    'account.securityPolicy': 'Security Policy',
    'account.passwordPolicy': 'Password Policy',
    'account.policyBasic': 'Basic',
    'account.policyStrong': 'Strong',
    'account.policyVeryStrong': 'Very Strong',
    'account.sessionTimeout': 'Session Timeout (minutes)',
    'account.ipWhitelist': 'IP Whitelist',
    'account.ipWhitelistHint': 'Leave empty to allow all IPs.',
    'account.dataCompliance': 'Data & Compliance',
    'account.auditLogging': 'Audit Logging',
    'account.auditLoggingDesc': 'Record all admin actions for compliance review.',
    'account.dataRetention': 'Data Retention (days)',
    'account.perMonth': '/ month',
    'account.currentDevice': 'Current Device',
    // Profile variant extras
    'profileSections.recentActivity': 'Recent Activity',
    'profileSections.team': 'Team',
    // API webhooks extras
    'api.webhookName': 'Webhook Name',
    'api.eventType': 'Event Type',
    'api.noWebhooks': 'No webhooks configured yet.',
    'common.on': 'On',
    'common.off': 'Off',
  },
};

let locales = $state(structuredClone(baseLocales));
const initialLocales = structuredClone(baseLocales);

/** Detect best locale from browser language */
function detectLocale(): string {
  if (typeof navigator === 'undefined') return 'en';
  const browserLang = navigator.language || navigator.languages?.[0] || 'zh-CN';
  if (locales[browserLang]) return browserLang;
  const prefix = browserLang.split('-')[0];
  for (const key of Object.keys(locales)) {
    if (key === browserLang || key.startsWith(prefix + '-')) return key;
  }
  if (locales[prefix]) return prefix;
  return 'en';
}

let currentLocale = $state(detectLocale());

/**
 * I18nProvider — pluggable translation boundary.
 * When set, all t/getLocale/getAvailableLocales delegates to it first,
 * falling back to the built-in locale tables. This lets apps integrate
 * existing i18n systems (svelte-i18n, paraglide, etc.) without rewriting callsites.
 */
export interface I18nProvider {
  translate: (key: string, params?: Record<string, string | number>) => string;
  getLocale: () => string;
  setLocale: (locale: string) => void;
  getAvailableLocales?: () => string[];
}

/** Owner-controlled values for one component-tree i18n scope. */
export interface I18nScopeOptions {
  locale?: string;
  provider?: I18nProvider;
  onLocaleChange?: (locale: string) => void;
}

/**
 * Tree-local i18n state. `updateOwner` synchronizes props without emitting a
 * change event, while `setLocale` represents a change requested inside the tree.
 */
export interface I18nScope {
  readonly locale: string;
  readonly provider: I18nProvider | undefined;
  translate: (key: string, params?: Record<string, string | number>) => string;
  setLocale: (locale: string) => void;
  setProvider: (provider: I18nProvider | undefined) => void;
  getAvailableLocales: () => string[];
  updateOwner: (options: I18nScopeOptions) => void;
}

const [readI18nScopeContext, writeI18nScopeContext] = createContext<I18nScope>();

function translateFromTables(
  locale: string,
  key: string,
  params?: Record<string, string | number>,
): string {
  const localeTable = locales[locale];
  let text = localeTable?.[key] ?? locales.en?.[key] ?? key;

  if (params) {
    for (const [param, value] of Object.entries(params)) {
      text = text.replaceAll(`{${param}}`, String(value));
    }
  }

  return text;
}

function readCurrentI18nScope(): I18nScope | undefined {
  try {
    return readI18nScopeContext();
  } catch {
    // Context is only readable while Svelte owns the current render/effect.
    // Public facade calls made outside a component intentionally use legacy state.
    return undefined;
  }
}

/** Create reactive i18n state that can be owned by one AdminApp tree. */
export function createI18nScope(options: I18nScopeOptions = {}): I18nScope {
  const initialProviderLocale = options.provider?.getLocale();
  const initialLocale = options.locale ?? initialProviderLocale ?? detectLocale();
  let scopeLocale = $state(initialLocale);
  let scopeProvider = $state.raw<I18nProvider | undefined>(options.provider);
  let onLocaleChange = $state.raw<((locale: string) => void) | undefined>(options.onLocaleChange);
  let ownerControlsLocale = options.locale !== undefined;

  function synchronizeProviderLocale(locale: string): void {
    if (scopeProvider && scopeProvider.getLocale() !== locale) {
      scopeProvider.setLocale(locale);
    }
  }

  if (options.locale !== undefined) {
    synchronizeProviderLocale(options.locale);
  }

  const scope: I18nScope = {
    get locale() {
      return scopeLocale;
    },
    get provider() {
      return scopeProvider;
    },
    translate(key, params) {
      // Establish the locale dependency even when a provider owns translation.
      const locale = scopeLocale;
      return scopeProvider?.translate(key, params) ?? translateFromTables(locale, key, params);
    },
    setLocale(locale) {
      const providerLocale = scopeProvider?.getLocale();
      const changed = scopeLocale !== locale || (scopeProvider !== undefined && providerLocale !== locale);

      scopeLocale = locale;
      synchronizeProviderLocale(locale);
      if (changed) onLocaleChange?.(locale);
    },
    setProvider(provider) {
      if (scopeProvider === provider) return;
      scopeProvider = provider;
      // Provider replacement is owner configuration, not a tree locale action.
      scopeLocale = provider?.getLocale() || detectLocale();
    },
    getAvailableLocales() {
      return scopeProvider?.getAvailableLocales?.() ?? Object.keys(locales);
    },
    updateOwner(nextOptions) {
      const providerChanged = scopeProvider !== nextOptions.provider;
      const clearedControlledLocale = ownerControlsLocale && nextOptions.locale === undefined;
      scopeProvider = nextOptions.provider;
      onLocaleChange = nextOptions.onLocaleChange;
      ownerControlsLocale = nextOptions.locale !== undefined;

      if (nextOptions.locale !== undefined) {
        scopeLocale = nextOptions.locale;
        synchronizeProviderLocale(nextOptions.locale);
      } else if (providerChanged || clearedControlledLocale) {
        scopeLocale = scopeProvider?.getLocale() || detectLocale();
      }
    },
  };

  return scope;
}

/** Attach an i18n scope to the current component tree. */
export function provideI18nScope(scope: I18nScope): I18nScope {
  writeI18nScopeContext(scope);
  return scope;
}

/** Return the current tree scope when called during a Svelte render/effect. */
export function getI18nScope(): I18nScope | undefined {
  return readCurrentI18nScope();
}

let i18nProvider: I18nProvider | undefined;

function setLegacyLocale(locale: string): void {
  i18nProvider?.setLocale(locale);
  currentLocale = locale;
}

function getLegacyLocale(): string {
  // Reading the rune keeps legacy consumers reactive.
  const locale = currentLocale;
  return i18nProvider?.getLocale() ?? locale;
}

function getLegacyAvailableLocales(): string[] {
  return i18nProvider?.getAvailableLocales?.() ?? Object.keys(locales);
}

function translateLegacy(key: string, params?: Record<string, string | number>): string {
  const locale = currentLocale;
  return i18nProvider?.translate(key, params) ?? translateFromTables(locale, key, params);
}

export function setI18nProvider(provider: I18nProvider | undefined): void {
  const scope = readCurrentI18nScope();
  if (scope) {
    scope.setProvider(provider);
    return;
  }
  i18nProvider = provider;
}

export function getI18nProvider(): I18nProvider | undefined {
  const scope = readCurrentI18nScope();
  return scope ? scope.provider : i18nProvider;
}

export function setLocale(locale: string): void {
  const scope = readCurrentI18nScope();
  if (scope) {
    scope.setLocale(locale);
    return;
  }
  setLegacyLocale(locale);
}

export function getLocale(): string {
  return readCurrentI18nScope()?.locale ?? getLegacyLocale();
}

export function getAvailableLocales(): string[] {
  return readCurrentI18nScope()?.getAvailableLocales() ?? getLegacyAvailableLocales();
}

export function t(key: string, params?: Record<string, string | number>): string {
  return readCurrentI18nScope()?.translate(key, params) ?? translateLegacy(key, params);
}

export function addTranslations(locale: string, translations: Record<string, string>): void {
  locales = { ...locales, [locale]: { ...locales[locale], ...translations } };
}

export function resetI18n(): void {
  currentLocale = detectLocale();
  locales = structuredClone(initialLocales);
  i18nProvider = undefined;
}

/**
 * useTranslation — Svelte 5 reactive translation hook
 * Tracks locale changes natively.
 */
export function useTranslation() {
  // Capture context while the component is initializing. Event handlers and
  // async continuations cannot safely call getContext later.
  const scope = readCurrentI18nScope();
  const translate = scope
    ? (key: string, params?: Record<string, string | number>) => scope.translate(key, params)
    : translateLegacy;
  const changeLocale = scope
    ? (locale: string) => scope.setLocale(locale)
    : setLegacyLocale;
  const availableLocales = scope
    ? () => scope.getAvailableLocales()
    : getLegacyAvailableLocales;

  return {
    get t() { return translate; },
    get locale() { return scope?.locale ?? getLegacyLocale(); },
    setLocale: changeLocale,
    getAvailableLocales: availableLocales,
  };
}
