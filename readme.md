# 🔔 Web Push 通知服务部署指南

本项目为基于 Vercel 的 Web 推送服务。请依照以下步骤完成配置并部署。

---

## 📌 步骤一：生成 VAPID 密钥

推送服务使用 VAPID 密钥进行签名认证，你可以通过以下任一方式生成一对密钥：

### ✅ 方法一：使用命令行生成

```bash
npx web-push generate-vapid-keys
```

输出示例：

```
Public Key:  BNcX...（略）
Private Key: 0rsk...（略）
```

### ✅ 方法二：使用在线工具生成

访问 [https://vapidkeys.com/](https://vapidkeys.com/) 并点击 `Generate`，然后复制 Public 和 Private Key。

---

## 🚀 步骤二：部署到 Vercel

1. 将本项目 Fork 或上传到你的 GitHub 仓库
2. 前往 [https://vercel.com/](https://vercel.com/) 并登录
3. 点击 **New Project**，选择该仓库，点击部署
4. 部署后进入项目 → **Settings → Environment Variables**，设置以下环境变量：

    ```
    VAPID_PUBLIC_KEY=你生成的公钥
    VAPID_PRIVATE_KEY=你生成的私钥
    API_SECRET_KEY=你自定义的密钥，用于后续推送消息使用。

    # 以下在创建 KV 后由 Vercel 自动注入
    KV_URL=
    KV_REST_API_URL=
    KV_REST_API_TOKEN=
    KV_REST_API_READ_ONLY_TOKEN=
    ```

---

## 🗃️ 步骤三：创建 Vercel KV 存储(Upstash for Redis)

1. 在项目中点击中间菜单 **Storage → Upstash for Redis**
2. 创建一个新的 KV 实例并命名（例如 `push-subscriptions`）
3. 创建成功后，KV 相关的环境变量将自动注入到你的项目中
4. 重新部署项目，环境变量即可生效

---

部署完成后，打开前端，会有指引和测试！  
无任何安全措施，切勿对外透漏Vercel的随机域名。