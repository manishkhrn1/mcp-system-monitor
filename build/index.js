import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import os from "os";
const requestLog = [];
// 1. Initialize the Server
const server = new Server({ name: "system-monitor", version: "1.0.0" }, { capabilities: { tools: {} } });
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
            const type = request.params.arguments?.errorType;
            if (type === "timeout") {
                await new Promise(resolve => setTimeout(resolve, 5000));
                result = { content: [{ type: "text", text: "Timeout test complete." }] };
            }
            else {
                // This will jump straight to the catch block!
                throw new Error("CRITICAL_FAILURE: Simulated crash.");
            }
        }
        else if (toolName === "get_request_log") {
            result = { content: [{ type: "text", text: JSON.stringify(requestLog, null, 2) }] };
        }
        // IF WE GET HERE, IT WAS A SUCCESS
        requestLog.push({
            timestamp: new Date().toISOString(),
            tool: toolName,
            status: "success"
        });
        return result || { content: [{ type: "text", text: "Tool executed." }] };
    }
    catch (error) {
        // IF WE GET HERE, IT WAS AN ERROR
        const errorMessage = error instanceof Error ? error.message : String(error);
        requestLog.push({
            timestamp: new Date().toISOString(),
            tool: toolName,
            status: "error",
            message: errorMessage
        });
        // We still throw the error so the AI/Inspector knows it failed
        throw error;
    }
});
// 4. Start the server using Standard Input/Output
const transport = new StdioServerTransport();
await server.connect(transport);
//# sourceMappingURL=index.js.map