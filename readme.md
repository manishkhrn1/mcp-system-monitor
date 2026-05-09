# 🔍 MCP System Monitor & Debugger
**A Model Context Protocol (MCP) server for real-time infrastructure monitoring.**

## 🚀 Overview
This project implements the MCP standard to allow AI agents to interact with host system metrics. It serves as the foundation for a specialized MCP Debugging tool.

## 🛠️ Features
- **get_system_stats:** Provides real-time CPU and Memory usage via Node.js `os` module.
- **TypeScript Core:** Built with modern ESM and NodeNext for type safety.
- **Standard I/O Transport:** Compatible with all MCP-compliant hosts (Claude Desktop, etc.).

## 📖 How to Test
1. `npm run build`
2. `npx @modelcontextprotocol/inspector node build/index.js`

## 🏗️ Architecture
- **Protocol:** MCP (Model Context Protocol) over Stdio.
- **Real-time Feed:** WebSockets (ws) broadcasting tool telemetry.
- **Backend:** Node.js / TypeScript.
- **Frontend:** Bootstrap 5 with Vanilla JS.

## 📈 Scalability
The server utilizes a non-blocking event loop to handle AI requests via Stdio while simultaneously streaming logs to multiple web clients via a WebSocket server on port 8080.