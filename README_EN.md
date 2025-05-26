# RemoteControl

[中文文档入口 (README.md)](./README.md)

A WebSocket-based remote control service supporting remote interaction with clients via HTTP API and WebSocket.

## Background

This project is designed for remote device control, providing real-time communication with devices via WebSocket and offering authentication, command execution, and other operations through HTTP API.

## Features

- **WebSocket Connection**: Establish and maintain long connections with clients for remote control.
- **JWT Authentication**: Secure client connections using JWT (JSON Web Token) authentication.
- **Command Execution**: Send commands to specified clients and receive execution results.
- **Heartbeat Detection**: Keep WebSocket connections alive with regular ping/pong checks and disconnect unresponsive clients.

## Installation & Usage

Make sure you have Node.js and npm installed. Then run the following commands to install dependencies:

1. Clone the repository:

   ```bash
   git clone https://github.com/Wyndra/RemoteControl.git
   ```
2. Enter the project directory:

   ```bash
   cd RemoteControl
   ```
3. Install dependencies:

   ```bash
   npm install
   ```

### Server

Start the server with:

```bash
node server.js
```

By default, the server runs on port `3080`.

### Client

#### Start

- **Direct run**

  ```bash
  node client.js
  ```
- **Run in background**

  ```bash
  nohup node client.js > output.log 2>&1 &
  ```

#### Configuration File

- `clientId`: Unique identifier for the client.
- `serverUrl`: Server address and port for WebSocket connection.
- `apiKey`: API key for authentication (must match the server's key).
- `intervals`: Heartbeat and retry interval settings:
  - `check`: Heartbeat check interval (ms)
  - `ping`: Ping interval (ms)
  - `pongTimeout`: Pong timeout (ms)
  - `maxRetry`: Max retry interval (ms)
  - `initialRetry`: Initial retry interval (ms)

Example config:

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

## API

### Get JWT Token

Obtain a JWT token for WebSocket authentication.

- **POST /auth**
- **Request Body**:

```json
{
    "apiKey": "your-api-key",
    "clientId": "your-client-id"
}
```

- **Response Example**:

```json
{
    "token": "your-jwt-token"
}
```

### Get Online Clients

Get a list of currently connected clientIds.

- **GET /clients**
- **Headers**: `Authorization: Bearer your-jwt-token`
- **Response Example**:

```json
{
    "clients": ["client1", "client2"]
}
```

### Execute Command

Send a command to a specified client. The server will check if the client matches the token and return the execution result.

- **POST /execute**
- **Request Body**:

```json
{
    "command": "your-command",
    "clientId": "client1",
    "timeout": 30000 // optional, ms, default 30000
}
```

- **Response Example**:

```json
{
    "clientId": "client1",
    "result": {
        "command": "your-command",
        "success": true,
        "output": "command output",
        "error": null
    }
}
```

- **Timeout Example**:

```json
{
    "clientId": "client1",
    "result": {
        "error": "Client execution timeout"
    }
}
```

## Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a new branch (`git checkout -b feature-name`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to your branch (`git push origin feature-name`)
5. Submit a Pull Request

## License

This project is licensed under the [MIT License](LICENSE).

## Contact

- Email: <q3199608937@gmail.com>
- Github: [https://github.com/Wyndra/RemoteControl.git](https://github.com/Wyndra/RemoteControl.git)

## Acknowledgements

Thanks to the following open source projects:

- [ws WebSocket library](https://www.npmjs.com/package/ws)

---

[中文文档入口 (README.md)](./README.md)
