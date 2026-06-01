import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import * as ftp from "basic-ftp";
import * as fs from "fs/promises";

// Configurations
const NODE_RED_URL = "http://10.1.68.100:1886";
const NODE_RED_USER = "admin";
const NODE_RED_PASS = "oem2022";

const FTP_HOST = "10.0.0.2";
const FTP_USER = "Naphat";
const FTP_PASS = "O@m11o1toolBox";

const server = new Server(
  {
    name: "mes-custom-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_server_credentials",
        description: "Get all static server connections (MSSQL, FTP, Node-RED) so you know how to connect.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "get_project_rules",
        description: "Get the strict rules and workflows for this project (e.g. database safety rules). MUST be read before taking critical actions.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "nodered_get_flows",
        description: "Fetch all active flows from the Node-RED server.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "ftp_list_files",
        description: "List files in a specific remote FTP directory.",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string", description: "The remote path to list. Example: / or /public_html" }
          },
          required: ["path"]
        }
      },
      {
        name: "ftp_upload_file",
        description: "Upload a local file to the FTP server.",
        inputSchema: {
          type: "object",
          properties: {
            localPath: { type: "string", description: "Absolute path to the local file." },
            remotePath: { type: "string", description: "Path on the remote FTP server to save the file." }
          },
          required: ["localPath", "remotePath"]
        }
      }
    ],
  };
});

async function getNodeRedToken() {
  const resp = await axios.post(`${NODE_RED_URL}/auth/token`, {
    client_id: "node-red-editor",
    grant_type: "password",
    scope: "*",
    username: NODE_RED_USER,
    password: NODE_RED_PASS
  });
  return resp.data.access_token;
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "get_server_credentials") {
      return {
        content: [{
          type: "text",
          text: `
SSMS (SQL Server): 10.1.1.31 | DB: IIOT_TOOLBOX | User: TOOLBOX | Pass: I1o1@T@#1boX
FTP (Filezilla): ftp://Naphat@10.0.0.2/ | User: Naphat | Pass: O@m11o1toolBox
Node-RED: http://10.1.68.100:1886/ | User: admin | Pass: oem2022
          `.trim()
        }]
      };
    }

    if (name === "get_project_rules") {
      try {
        const rules = await fs.readFile("e:/MES/MES/MES/ProjectRules.md", "utf-8");
        return {
          content: [{ type: "text", text: rules }]
        };
      } catch (e) {
        return {
          content: [{ type: "text", text: "No project rules found." }]
        };
      }
    }

    if (name === "nodered_get_flows") {
      const token = await getNodeRedToken();
      const resp = await axios.get(`${NODE_RED_URL}/flows`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }]
      };
    }

    if (name === "ftp_list_files") {
      const client = new ftp.Client();
      try {
        await client.access({
          host: FTP_HOST,
          user: FTP_USER,
          password: FTP_PASS,
        });
        const list = await client.list(args.path);
        const formatList = list.map(item => `${item.type === 2 ? 'DIR' : 'FILE'} ${item.name} (${item.size} bytes)`).join('\n');
        return {
          content: [{ type: "text", text: formatList || "Empty directory" }]
        };
      } finally {
        client.close();
      }
    }

    if (name === "ftp_upload_file") {
      const client = new ftp.Client();
      try {
        await client.access({
          host: FTP_HOST,
          user: FTP_USER,
          password: FTP_PASS,
        });
        await client.uploadFrom(args.localPath, args.remotePath);
        return {
          content: [{ type: "text", text: `Successfully uploaded ${args.localPath} to ${args.remotePath}` }]
        };
      } finally {
        client.close();
      }
    }

    throw new Error(`Tool not found: ${name}`);
  } catch (err) {
    return {
      content: [{ type: "text", text: `Error: ${err.message}` }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
server.connect(transport).catch(console.error);
