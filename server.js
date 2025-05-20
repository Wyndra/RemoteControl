const WebSocket = require('ws');
const express = require('express');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const app = express();
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

function timestampToTime(times) {
    let time = times[1]
    let mdy = times[0]
    mdy = mdy.split('/')
    let month = parseInt(mdy[0]);
    let day = parseInt(mdy[1]);
    let year = parseInt(mdy[2])
    return year + '-' + month + '-' + day + ' ' + time
}

// 日志函数
function log(message, type = 'info') {
    let time = new Date()
    let nowTime = timestampToTime(time.toLocaleString('en-US', { hour12: false }).split(" "))
    const prefix = type === 'error' ? '❌ ERROR' : '✅ INFO';
    console.log(`[${nowTime}] ${prefix}: ${message}`);
}

// JWT密钥,尽量复杂
const JWT_SECRET = 'you-jwt-secret';

// 必须和客户端的API_KEY一致
const API_KEY = 'T&9jF#pL7rQz!2mXkV@1BzUo0LxW';
// 客户端密钥,需运行客户端代码后在config.json中查看

// 存储连接的客户端
const connectedClients = new Map(); // 使用Map来存储多个客户端
const clientSecrets = new Map(); // 存储客户端的客户端密钥
const pendingCommands = new Map(); // requestId -> { resolve, reject, timeout }

// WebSocket连接处理
wss.on('connection', (ws, req) => {
    // 验证token
    const token = new URL(req.url, 'ws://localhost').searchParams.get('token');
    if (!token) {
        ws.close(1008, '未提供认证token');
        return;
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const clientId = decoded.clientId || 'unknown'; // 从token中获取clientId
        log(`客户端 ${clientId} 已认证并连接`);
        
        // 存储客户端连接
        connectedClients.set(clientId, ws);
        ws.clientId = clientId; // 在ws对象上存储clientId

        // 设置心跳检测
        ws.isAlive = true;

        ws.on('pong', () => {
            ws.isAlive = true;
        });

        ws.on('ping', () => {
            ws.pong();
        });

        ws.on('message', (message) => {
            try {
                const response = JSON.parse(message);
                log(`收到来自客户端 ${clientId} 的响应:`);
                console.log(response)
                // 新增：处理命令执行结果
                if (response.type === 'commandResult' && response.requestId) {
                    const pending = pendingCommands.get(response.requestId);
                    if (pending) {
                        clearTimeout(pending.timeout);
                        pending.resolve(response.result);
                        pendingCommands.delete(response.requestId);
                    }
                }
            } catch (error) {
                log(`收到来自客户端 ${clientId} 的无效消息:${error}`, "error");
            }
        });

        ws.on('close', () => {
            log(`客户端 ${clientId} 断开连接`);
            connectedClients.delete(clientId);
        });

        // 设置连接超时检查
        const interval = setInterval(() => {
            if (ws.isAlive === false) {
                log(`客户端 ${clientId} 未响应，关闭连接`);
                clearInterval(interval);
                connectedClients.delete(clientId);
                return ws.terminate();
            }
            
            ws.isAlive = false;
            ws.ping();
        }, 30000);

        // 当连接关闭时清理interval
        ws.on('close', () => {
            clearInterval(interval);
        });

    } catch (err) {
        ws.close(1008, '无效的token');
    }
});

// HTTP API接口
app.use(express.json());

// 验证中间件
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: '未提供token' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: '无效的token' });
        }
        req.user = user;
        next();
    });
};

// 获取JWT token的接口
app.post('/auth', (req, res) => {
    const { apiKey, clientId, clientSecret } = req.body;
    
    if (apiKey !== API_KEY) {
        return res.status(401).json({ error: '无效的API密钥' });
    }

    if (!clientId) {
        return res.status(400).json({ error: '缺少clientId' });
    }

    // 存储客户端的客户端密钥
    clientSecrets.set(clientId, clientSecret);

    const token = jwt.sign({ 
        authorized: true,
        clientId: clientId 
    }, JWT_SECRET, { expiresIn: '24h' });
    
    res.json({ token });
});

// 获取所有在线客户端
app.get('/clients', authenticateToken, (req, res) => {
    const clients = Array.from(connectedClients.keys());
    res.json({ clients });
});

// 执行命令的接口（添加认证）
app.post('/execute', authenticateToken, async (req, res) => {
    // timeout是为了防止请求过长，pendingCommands会在timeout毫秒后超时
    let { command, clientId, clientSecret, timeout } = req.body;
    timeout = Number(timeout) || 30000;
    if (!command) {
        return res.status(400).json({ error: '缺少command参数' });
    }

    // 验证客户端的客户端密钥
    if (clientSecrets.get(clientId) !== clientSecret) {
        return res.status(403).json({ error: '无效的客户端密钥!请重新运行客户端进行获取' });
    }

    // 如果指定了clientId，则发送到特定客户端
    if (clientId) {
        const client = connectedClients.get(clientId);
        if (!client) {
            return res.status(404).json({ error: `客户端 ${clientId} 未连接` });
        }
        // 判断只有来自authenticateToken中间件的用户才能操作自己的clientId
        try {
            const user = jwt.verify(req.headers['authorization'].split(' ')[1], JWT_SECRET);
            if (user.clientId !== clientId) {
                return res.status(403).json({ error: '无权操作该clientId' });
            }
        } catch (err) {
            return res.status(403).json({ error: '无效token' });
        }
        // 新增：生成requestId，等待结果
        const requestId = uuidv4();
        client.send(JSON.stringify({ type: 'command', command, requestId }));
        // 等待客户端返回结果，超时可动态指定
        const result = await new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                pendingCommands.delete(requestId);
                reject(new Error('客户端执行超时'));
            }, timeout);
            pendingCommands.set(requestId, { resolve, reject, timeout: timer });
        }).catch(err => ({ error: err.message }));
        return res.json({ clientId, result });
    }

    // 如果没有指定clientId，则发送到所有客户端
    // if (connectedClients.size === 0) {
    //     return res.status(503).json({ error: '没有可用的客户端连接' });
    // }

    // // 广播命令到所有连接的客户端
    // connectedClients.forEach((client, id) => {
    //     client.send(JSON.stringify({ type: 'command', command }));
    // });

    // res.json({ 
    //     message: '命令已广播到所有客户端',
    //     clientCount: connectedClients.size
    // });
});

const PORT = 3080;
server.listen(PORT, () => {
    console.log(`服务器运行在端口 ${PORT}`);
});