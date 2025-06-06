# RemoteControl

[English Version (README_EN.md)](./README_EN.md)

基于 WebSocket 的远程控制服务，支持通过 HTTP API 和 WebSocket 实现与客户端的远程交互。

## 背景

该项目用于远程控制设备，提供了通过 WebSocket 与设备进行实时通信的功能，并通过 HTTP API 提供了认证、命令执行等操作。

## 功能

- **WebSocket 连接**：支持通过 WebSocket 与客户端建立连接，并保持长连接进行远程控制。
- **JWT 认证**：通过 JWT（JSON Web Token）认证机制，确保只有授权的客户端可以连接到 WebSocket 服务。
- **命令执行**：可以向指定客户端发送命令进行执行，并获取执行结果。
- **心跳检测**：确保 WebSocket 连接活跃，定时发送 `ping` 和接收 `pong`，超时自动断开无响应的连接。

## 安装与使用
确保你的系统已经安装了 Node.js 和 npm。然后运行以下命令安装项目依赖：

1. 克隆项目到本地：

   ```bash
   git clone https://github.com/Wyndra/RemoteControl.git
   ```

2. 进入项目目录：

   ```bash
   cd RemoteControl
   ```

3. 安装依赖项：

   ```bash
   npm install
   ```

### 服务端

运行以下命令启动服务端：

```bash
node server.js
```

默认情况下，服务器将运行在端口 `3080`。

### 客户端

#### 启动
- **直接运行**

  ```bash
  node client.js
  ```
- **后台运行**

  ```bash
  nohup node client.js > output.log 2>&1 &
  ```

#### 配置文件
- `clientId`: 客户端的唯一标识符，每个客户端都会有一个唯一的 `clientId`，用于标识不同的客户端。
- `serverUrl`: 服务端的地址和端口，客户端将连接到该地址的 WebSocket 服务。
- `apiKey`: 用于认证的 API 密钥。该密钥必须与服务端配置的密钥一致才能成功进行认证。
- `intervals`: 心跳检测的时间间隔配置，包括以下字段：
  - `check`：检查心跳的时间间隔（毫秒）
  - `ping`：发送心跳 ping 的时间间隔（毫秒）
  - `pongTimeout`：等待 pong 的超时时间（毫秒）
  - `maxRetry`：最大重试间隔（毫秒）
  - `initialRetry`：初始重试时间间隔（毫秒）

##### 示例配置文件
```json
{
  "clientId": "client-0103u6r6i",
  "serverUrl": "remo.srcandy.top",
  "apiKey": "T&9jF#pL7rQz!2mXkV@1BzUo0LxW",
  "intervals": {
    "check": 10000,
    "ping": 10000,
    "pongTimeout": 5000,
    "maxRetry": 30000,
    "initialRetry": 5000
  }
}
```

## API 接口

### 获取 JWT Token

使用 API 密钥和 `clientId` 获取 JWT Token，该 Token 用于 WebSocket 连接的身份验证。

- **请求方式**：`POST /auth`
- **请求体**：

```json
{
    "apiKey": "your-api-key",
    "clientId": "your-client-id"
}
```

- **响应示例**：

```json
{
    "token": "your-jwt-token"
}
```

### 获取在线客户端列表

获取当前已连接的所有客户端的 `clientId` 列表。

- **请求方式**：`GET /clients`
- **请求头**：`Authorization: Bearer your-jwt-token`
- **响应示例**：

```json
{
    "clients": ["client1", "client2"]
}
```

### 执行命令

向指定的客户端发送命令进行执行，服务器会校验客户端是否和 token 信息匹配，如果匹配则执行命令，并返回执行结果。

- **请求方式**：`POST /execute`
- **请求体**：

```json
{
    "command": "your-command",
    "clientId": "client1",
    "timeout": 30000 // 可选，单位毫秒，默认30000
}
```

- **响应示例**：

```json
{
    "clientId": "client1",
    "result": {
        "command": "your-command",
        "success": true,
        "output": "命令输出内容",
        "error": null
    }
}
```

- **超时示例**：

```json
{
    "clientId": "client1",
    "result": {
        "error": "客户端执行超时"
    }
}
```

## 贡献

我们欢迎社区成员的贡献！如果你希望为该项目做出贡献，请按照以下步骤进行：

1. Fork 本仓库
2. 创建一个新的分支 (`git checkout -b feature-name`)
3. 提交你的更改 (`git commit -am 'Add new feature'`)
4. 推送到远程分支 (`git push origin feature-name`)
5. 提交 Pull Request

## 许可证

本项目使用 [MIT 许可证](LICENSE)。

## 联系方式

- Email: <q3199608937@gmail.com>
- Github: <https://github.com/Wyndra/RemoteControl.git>

## 致谢

感谢以下开源项目对本项目的支持：

- [WebSocket库](https://www.npmjs.com/package/ws)

---

[English Version (README_EN.md)](./README_EN.md)
