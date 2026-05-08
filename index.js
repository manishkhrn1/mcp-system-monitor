"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const os_1 = __importDefault(require("os"));
// 1. Initialize the Server
const server = new index_js_1.Server({ name: "system-monitor", version: "1.0.0" }, { capabilities: { tools: {} } });
// 2. Tell the AI what tools are available
server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => ({
    tools: [
        {
            name: "get_system_stats",
            description: "Get real-time CPU and Memory usage from the host machine.",
            inputSchema: { type: "object", properties: {} },
        },
    ],
}));
// 3. Define what happens when the tool is called
server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
    if (request.params.name === "get_system_stats") {
        const freeMem = os_1.default.freemem() / 1024 / 1024 / 1024; // GB
        const totalMem = os_1.default.totalmem() / 1024 / 1024 / 1024; // GB
        return {
            content: [{
                    type: "text",
                    text: `System Stats: ${freeMem.toFixed(2)}GB free of ${totalMem.toFixed(2)}GB total. CPU Cores: ${os_1.default.cpus().length}`
                }],
        };
    }
    throw new Error("Tool not found");
});
// 4. Start the server using Standard Input/Output
const transport = new stdio_js_1.StdioServerTransport();
await server.connect(transport);
//# sourceMappingURL=index.js.map