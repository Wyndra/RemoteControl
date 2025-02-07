const WebSocket = require('ws');
const express = require('express');
const jwt = require('jsonwebtoken');
const app = express();
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

// JWT密钥
const JWT_SECRET = 'your-secret-key';
const API_KEY = 'Bwzdc6530.';

// 存储连接的客户端
const connectedClients = new Map(); // 使用Map来存储多个客户端

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
        console.log(`客户端 ${clientId} 已认证并连接`);
        
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
                console.log(`收到来自客户端 ${clientId} 的响应:`, response);
            } catch (error) {
                console.error('解析消息失败:', error);
            }
        });

        ws.on('close', () => {
            console.log(`客户端 ${clientId} 断开连接`);
            connectedClients.delete(clientId);
        });

        // 设置连接超时检查
        const interval = setInterval(() => {
            if (ws.isAlive === false) {
                console.log(`客户端 ${clientId} 响应超时，关闭连接`);
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
    const { apiKey, clientId } = req.body;
    
    if (apiKey !== API_KEY) {
        return res.status(401).json({ error: '无效的API密钥' });
    }

    if (!clientId) {
        return res.status(400).json({ error: '缺少clientId' });
    }

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
app.post('/execute', authenticateToken, (req, res) => {
    const { command, clientId } = req.body;
    
    if (!command) {
        return res.status(400).json({ error: '缺少command参数' });
    }

    // 如果指定了clientId，则发送到特定客户端
    if (clientId) {
        const client = connectedClients.get(clientId);
        if (!client) {
            return res.status(404).json({ error: `客户端 ${clientId} 未连接` });
        }
        client.send(JSON.stringify({ type: 'command', command }));
        return res.json({ message: `命令已发送到客户端 ${clientId}` });
    }

    // 如果没有指定clientId，则发送到所有客户端
    if (connectedClients.size === 0) {
        return res.status(503).json({ error: '没有可用的客户端连接' });
    }

    // 广播命令到所有连接的客户端
    connectedClients.forEach((client, id) => {
        client.send(JSON.stringify({ type: 'command', command }));
    });

    res.json({ 
        message: '命令已广播到所有客户端',
        clientCount: connectedClients.size
    });
});

const PORT = 3080;
server.listen(PORT, () => {
    console.log(`服务器运行在端口 ${PORT}`);
}); 