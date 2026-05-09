import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import os from "os";
import { WebSocketServer, WebSocket } from 'ws';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import * as fs from "node:fs/promises";

// Define a better structure for your logs
interface McpLog {
  timestamp: string;
  tool: string;
  status: "success" | "error";
  message?: string; // Optional: store the error message if it fails
}

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_FILE = "logs.json";
const requestLog: McpLog[] = [];

// Create a WebSocket server on port 8080
const wss = new WebSocketServer({ port: 8080 });
let clients: WebSocket[] = [];


app.use(express.static(path.join(__dirname, '../dashboard')));

app.listen(3000, () => {
  console.error("Dashboard available at http://localhost:3000");
});

wss.on('connection', (ws) => {
  clients.push(ws);
  // Send the existing history immediately upon connection
  ws.send(JSON.stringify({ type: 'INIT', data: requestLog }));
  
  ws.on('close', () => {
    clients = clients.filter(client => client !== ws);
  });
});

wss.on('error', (error) => {
  console.error("WebSocket Server Error:", error);
});

// Save logs whenever a new one is added
async function saveLogs() {
  await fs.writeFile(LOG_FILE, JSON.stringify(requestLog, null, 2));
}

// Helper function to broadcast to all open dashboards
// Helper function to broadcast to all open dashboards and persist data
async function broadcastLog(logEntry: McpLog) {
  const message = JSON.stringify({ type: 'NEW_LOG', data: logEntry });
  
  // 1. Send to all connected web clients
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });

  // 2. Save to the JSON database file
  try {
    await saveLogs();
  } catch (error) {
    console.error("Failed to save logs to file:", error);
  }
}



async function loadLogs() {
  try {
    const data = await fs.readFile(LOG_FILE, "utf-8");
    const savedLogs = JSON.parse(data);
    requestLog.push(...savedLogs);
  } catch (e) {
    // If file doesn't exist, just start fresh
    await fs.writeFile(LOG_FILE, "[]");
  }
}

// 1. Initialize the Server

const server = new Server(
  { name: "system-monitor", version: "1.0.0" },
  { capabilities: { tools: {} } }
);


// 2. Tell the AI what tools are available
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "get_system_stats",
      description: "Get real-time CPU and Memory usage from the host machine.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "get_request_log",
      description: "See a history of all MCP tools called during this session.",
      inputSchema: { type: "object", properties: {} },
    },
    {
  name: "trigger_chaos",
  description: "Deliberately triggers a server error to test the debugger's logging.",
  inputSchema: { 
    type: "object", 
    properties: {
      errorType: { type: "string", enum: ["timeout", "crash"] }
    }
  },
},
  ],
}));

// 3. Define what happens when the tool is called
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;
  
  try {
    let result;

    if (toolName === "get_system_stats") {
      const freeMem = os.freemem() / 1024 / 1024 / 1024;
      result = {
        content: [{ type: "text", text: `Free Memory: ${freeMem.toFixed(2)} GB` }],
      };
    } 
    
    else if (toolName === "trigger_chaos") {
      const type = (request.params.arguments as any)?.errorType;
      if (type === "timeout") {
        await new Promise(resolve => setTimeout(resolve, 5000));
        result = { content: [{ type: "text", text: "Timeout test complete." }] };
      } else {
        // This will jump straight to the catch block!
        throw new Error("CRITICAL_FAILURE: Simulated crash.");
      }
    }

    else if (toolName === "get_request_log") {
      result = { content: [{ type: "text", text: JSON.stringify(requestLog, null, 2) }] };
    }

    const newEntry: McpLog = { 
      timestamp: new Date().toISOString(), 
      tool: toolName, 
      status: "success" 
    };

    // IF WE GET HERE, IT WAS A SUCCESS
    requestLog.push(newEntry);
    broadcastLog(newEntry);
    return result || { content: [{ type: "text", text: "Tool executed." }] };

  } catch (error) {
    // IF WE GET HERE, IT WAS AN ERROR
    const errorMessage = error instanceof Error ? error.message : String(error);
    
// 1. Create the error entry object
    const errorEntry: McpLog = { 
      timestamp: new Date().toISOString(), 
      tool: toolName, 
      status: "error",
      message: errorMessage
    };

    // 2. Push and Broadcast
    requestLog.push(errorEntry);
    broadcastLog(errorEntry); // Use errorEntry here
    // We still throw the error so the AI/Inspector knows it failed
    throw error; 
  }
});

await loadLogs();

// 4. Start the server using Standard Input/Output
const transport = new StdioServerTransport();
await server.connect(transport);