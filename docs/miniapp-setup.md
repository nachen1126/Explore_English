# Explore English 微信小程序 MVP 配置

本仓库保留原有 Vite 网页应用，并在 `miniapp/` 中提供独立的 Taro 4 微信小程序。第一阶段只发布 `Food & Dining → Kitchen · Cooking`。`packages/shared/` 是网页与小程序共同使用的纯 TypeScript 数据和逻辑，不包含 DOM、Web Speech API、localStorage 或 React 组件。

## 1. 申请微信小程序 AppID

1. 前往[微信公众平台](https://mp.weixin.qq.com/)注册“小程序”账号并完成主体认证。
2. 在“开发 → 开发管理 → 开发设置”复制 AppID。
3. 不要把 AppSecret 写入仓库。本方案使用微信云开发身份上下文，客户端不需要 AppSecret。
4. 将 `miniapp/project.private.config.example.json` 复制为 `miniapp/project.private.config.json`，把 `appid` 改为真实 AppID。该文件已被 `.gitignore` 排除。

仓库中的 `project.config.json` 使用微信开发者工具的 `touristappid`，仅用于无账号的构建/界面预览，不代表真实登录已经接通。

## 2. 创建并绑定 CloudBase 环境

1. 使用该小程序 AppID 登录微信开发者工具。
2. 打开“云开发”，创建一个环境，记录环境 ID（例如 `prod-xxxx`），生产与测试环境建议分开。
3. 确认环境绑定的是同一个小程序 AppID。
4. 复制 `miniapp/.env.example` 为 `miniapp/.env.local`，填写公开标识：

   ```text
   TARO_APP_CLOUDBASE_ENV=你的环境ID
   ```

5. `Taro.cloud.init` 只读取这个公开环境 ID。OpenID 由云函数的 `cloud.getWXContext()` 获取，客户端不会收到或保存 OpenID、session key。

## 3. 创建数据库集合与安全规则

在 CloudBase 数据库中创建以下集合：

- `users`：`_id`、`createdAt`、`lastLoginAt`、`lastStudyAt`、`nickname`、`avatar`
- `sceneProgress`：`_id`、`userId`、`sceneId`、`discoveredVocabularyIds`、`completed`、`updatedAt`、`schemaVersion`
- `challengeAttempts`：`_id`、`userId`、`sceneId`、`attemptId`、`questions`、`firstAttemptResults`、`score`、`remembered`、`needsPractice`、`startedAt`、`completedAt`
- `admins`：服务端管理员允许列表

四个集合都设置为“仅管理端可读写”。小程序前端不直接查询集合，所有读写都经过云函数。`user-service` 忽略客户端提供的任何用户 ID，只根据调用者 OpenID 的服务端哈希查写本人数据；因此用户 A 不能构造查询读取用户 B。

建议索引：

- `sceneProgress`: `userId + sceneId`（唯一业务组合）
- `challengeAttempts`: `userId + attemptId`（唯一业务组合）
- `users`: `createdAt`、`lastLoginAt`、`lastStudyAt`

## 4. 部署云函数

在微信开发者工具中导入 `miniapp/` 后，选择对应云环境；在“云函数”目录中分别右键并选择“上传并部署：云端安装依赖”：

- `user-service`：登录、资料、拉取、合并和同步进度，并验证完整挑战、弱词练习及三次答错后的答案提示记录
- `speech-recognize`：录音文件转写；未配置 ASR 时明确返回 `ASR_NOT_CONFIGURED`
- `speech-synthesize`：读取并返回随云函数部署的 10 个 Kitchen 标准英语 WAV 发音；不需要 TTS 密钥
- `admin-stats-http`：网页版管理员统计的 HTTPS 网关函数

也可以使用 CloudBase CLI 部署。部署前必须选择正确环境，切勿在命令或配置文件中硬编码密钥。

每次更新 `miniapp/cloudfunctions/user-service/` 后，都要重新右键该目录并选择“上传并部署：云端安装依赖”。否则新版小程序创建的弱词练习记录会被旧版云函数拒绝，但记录仍会先保存在本机。

函数运行时请选择 Node.js 18 或更新版本。云存储规则设置为“仅创建者可读写”；录音上传后由 `speech-recognize` 在 `finally` 流程中删除，不能把语音文件设置为公开读。

## 5. 微信登录与游客模式

- 用户点击“微信登录”后，小程序调用 `Taro.login`，随后调用 `user-service`；云函数从可信上下文取得 OpenID 并生成不可逆的 32 位用户 ID。
- 小程序不保存 `code`、OpenID 或 session key。
- 游客记录只保存在 `explore-english-miniapp-guest-v1`。
- 每个账号在本机首次登录且检测到游客记录时会询问是否合并，并记录该账号的选择以避免每次启动重复询问；已发现词取并集，挑战按 `attemptId` 去重，空数据不会覆盖云端。
- 退出登录只清除当前账户的私人缓存和自动登录偏好，随后恢复独立游客空间。
- 离线时每次操作先写本地；云同步失败会显示提示，联网或重新显示页面后可重试。

## 6. 创建第一个管理员

网页版管理员仍先经过现有 Supabase 的服务端 `is_admin()` 验证。若要显示小程序 CloudBase 数据，再执行：

1. 取得该网页管理员的 Supabase Auth 用户 UUID（不是邮箱，也不是 token）。
2. 在 CloudBase `admins` 集合创建文档：

   ```json
   { "_id": "supabase:该Supabase用户UUID", "enabled": true }
   ```

3. 为 `admin-stats-http` 添加 HTTPS 网关触发器，只允许 `POST` 与 `OPTIONS`。
4. 云函数环境变量设置：

   - `ADMIN_WEB_ORIGIN=https://nachen1126.github.io`
   - `SUPABASE_URL`：现有 Supabase 项目 URL
   - `SUPABASE_ANON_KEY`：现有 publishable/anon key（不是 service role key）

5. 把网关 URL 保存为 GitHub Actions Repository Variable `VITE_CLOUDBASE_ADMIN_ENDPOINT`，重新部署网页。

函数使用浏览器提交的当前 Supabase access token 向 Supabase Auth 验证用户，再检查服务端 `admins` 集合。修改 localStorage、隐藏按钮或伪造前端字段不能取得管理员权限。返回值不包含 OpenID、session key、token 或邮箱。

## 7. 配置腾讯云语音识别

语音回答现在是单次点击流程：点击“语音回答”后立即录音，约 3.6 秒后自动停止并识别，页面不再显示 Stop 按钮。微信 `RecorderManager` 的实时分帧是 MP3 编码数据，不能稳定地当作 PCM 音量使用，所以本版不做容易误判的伪 VAD，而采用稳定的短时定长自动录音。无语音、录音错误、网络错误和 ASR 错误都不会提交答案或计为答错。

真正转写需要开通[腾讯云一句话识别](https://cloud.tencent.com/document/product/1093/35646)。请按以下步骤操作：

1. 打开腾讯云控制台，搜索“语音识别”，进入后点击“立即开通”。
2. 在腾讯云“访问管理 → 用户列表 → 新建用户”创建一个仅用于语音识别的子账号，给它授权预设策略 `QcloudASRFullAccess`，再为它创建 API 密钥。这项策略只针对 ASR 产品；不要使用主账号密钥。
3. 打开 CloudBase 控制台，选择环境 `cloud1-d6gzm9ky0f3cabd8d`。
4. 左侧点“云函数”，点击 `speech-recognize`，进入“函数配置”。
5. 在“环境变量”中点“编辑”，必须新增 `TENCENT_SECRET_ID` 和 `TENCENT_SECRET_KEY`，值分别填上一步创建的 SecretId 和 SecretKey，不要加引号。同一页把“执行超时时间”设为 20 秒，避免冷启动时在识别返回前超时。
6. `TENCENT_ASR_PROJECT_ID` 可选；没有单独建立 ASR 项目时可不填，云函数会使用默认项目 `0`。`TENCENT_ASR_REGION` 也可选，不填时使用 `ap-shanghai`。
7. 保存环境变量。因为本次也修改了云函数代码，还要回到微信开发者工具，右键 `cloudfunctions/speech-recognize`，选择“上传并部署：云端安装依赖”。

SecretId/SecretKey 仅用于语音回答识别，不用于“播放发音”。这些值不得写进 `.env`、小程序代码、GitHub Variables 或构建产物。未配置时函数不会返回假识别结果。

`Play pronunciation` 使用 `speech-synthesize/audio/` 中随云函数部署的固定 WAV 文件。重新上传云函数时必须选择“上传并部署：云端安装依赖”，确保 `audio/` 目录一并上传；该播放功能不要求开通腾讯云语音合成，也不要求配置 TTS API Key。

## 8. 安装、构建与导入微信开发者工具

Node.js 22 环境中执行：

```powershell
cd miniapp
corepack enable
corepack prepare pnpm@11.19.0 --activate
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run test
pnpm run build:weapp
```

微信开发者工具选择“导入项目”，目录选择仓库内的 `miniapp`，而不是 `miniapp/dist`。工具会读取：

- 小程序输出：`miniapp/dist`
- 云函数源码：`miniapp/cloudfunctions`

填入真实 AppID、选择已经绑定的 CloudBase 环境，然后编译。不要关闭合法域名校验来代替正式配置。

## 9. 模拟器、预览与真机调试

1. 在开发者工具分别选择常见 iPhone、Android 和平板尺寸。
2. 进入 Kitchen，逐一点击 10 个物品，确认图片完整显示、热点随 3:2 图片缩放、对号位于对应热点内部右上角。
3. 完成 5 道 Listen & Find 与 5 道 What is this，故意让一题首答错误后改对，确认最终最高为 9/10。
4. 关闭并重新打开小程序，确认场景进度和结果仍存在。
5. 点击“预览”生成二维码，用已加入开发成员列表的微信扫码。
6. 使用“真机调试”重复全部 10 个热点、网络断开/恢复、录音权限拒绝与授权测试。

仓库自动化测试和桌面模拟构建不能替代真机验证。发布前必须记录至少一台 iOS 和一台 Android 的热点与录音结果。

## 10. 上传、体验版与微信审核

1. 确认 `pnpm run build:weapp` 成功且 CloudBase 环境为生产环境。
2. 在微信开发者工具点击“上传”，填写版本号与说明。
3. 微信公众平台“管理 → 版本管理”中把开发版设为体验版，完成内部验收。
4. 补齐隐私保护指引，明确录音用途、保存期限以及用户主动选择昵称/头像的用途。
5. 确认类目、服务内容、用户协议、隐私政策和录音权限说明符合要求。
6. 提交审核；审核通过后由管理员发布。

## 11. 绝不能提交的内容

- 小程序 AppSecret、session key、OpenID 明文
- CloudBase 管理密钥或自定义登录私钥
- 腾讯云 SecretId、SecretKey
- Supabase service role key
- 管理员访问令牌

提交前执行：

```powershell
git grep -n -I -E "(SecretKey|SecretId|service_role|session_key|AppSecret)" -- . ":(exclude)docs/miniapp-setup.md"
git status --short
```

命中环境变量名称是正常的；任何真实值都必须撤销、轮换并从 Git 历史中清除后才能推送。
