import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import os from "os";

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
  ],
}));

// 3. Define what happens when the tool is called
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "get_system_stats") {
    const freeMem = os.freemem() / 1024 / 1024 / 1024; // GB
    const totalMem = os.totalmem() / 1024 / 1024 / 1024; // GB
    
    return {
      content: [{ 
        type: "text", 
        text: `System Stats: ${freeMem.toFixed(2)}GB free of ${totalMem.toFixed(2)}GB total. CPU Cores: ${os.cpus().length}` 
      }],
    };
  }
  throw new Error("Tool not found");
});

// 4. Start the server using Standard Input/Output
const transport = new StdioServerTransport();
await server.connect(transport);