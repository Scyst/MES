import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import * as ftp from "basic-ftp";
import * as fs from "fs/promises";
import { PassThrough } from "stream";
import * as dotenv from "dotenv";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from parent directory
// NOTE: Temporarily redirect stdout -> stderr to prevent dotenv log from
//       corrupting the MCP stdio JSON channel.
const _write = process.stdout.write.bind(process.stdout);
process.stdout.write = process.stderr.write.bind(process.stderr);
dotenv.config({ path: path.join(__dirname, "../.env") });
process.stdout.write = _write;

// Configurations
const NODE_RED_URL = process.env.NODE_RED_URL;
const NODE_RED_USER = process.env.NODE_RED_USER;
const NODE_RED_PASS = process.env.NODE_RED_PASS;

const FTP_HOST = process.env.FTP_HOST;
const FTP_USER = process.env.FTP_USER;
const FTP_PASS = process.env.FTP_PASS;

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
      },
      {
        name: "ftp_download_file",
        description: "Download a remote file from the FTP server to a local path.",
        inputSchema: {
          type: "object",
          properties: {
            remotePath: { type: "string", description: "Path on the remote FTP server to download from." },
            localPath: { type: "string", description: "Absolute path to save the downloaded file locally." }
          },
          required: ["remotePath", "localPath"]
        }
      },
      {
        name: "ftp_read_file",
        description: "Read the text content of a remote file directly into memory without saving to disk. Use this to inspect code on the server.",
        inputSchema: {
          type: "object",
          properties: {
            remotePath: { type: "string", description: "Path on the remote FTP server to read." }
          },
          required: ["remotePath"]
        }
      },
      {
        name: "ftp_delete_file",
        description: "Delete a file on the remote FTP server.",
        inputSchema: {
          type: "object",
          properties: {
            remotePath: { type: "string", description: "Path of the file on the remote FTP server to delete." }
          },
          required: ["remotePath"]
        }
      },
      {
        name: "ftp_rename_file",
        description: "Rename or move a file on the remote FTP server. Useful for creating backups before overwriting (e.g. rename index.php to index_backup.php).",
        inputSchema: {
          type: "object",
          properties: {
            oldPath: { type: "string", description: "Current path of the file on the remote FTP server." },
            newPath: { type: "string", description: "New path/name for the file on the remote FTP server." }
          },
          required: ["oldPath", "newPath"]
        }
      },
      {
        name: "nodered_update_flows",
        description: "Push an updated flows JSON array to the Node-RED server, replacing all current flows. Use nodered_get_flows first to get the current state.",
        inputSchema: {
          type: "object",
          properties: {
            flows: { type: "array", description: "The full flows array (as returned by nodered_get_flows) with your modifications applied." }
          },
          required: ["flows"]
        }
      },
      {
        name: "ftp_upload_directory",
        description: "Recursively upload all files from a local directory to a remote FTP directory in one call. Preserves relative folder structure. Use instead of calling ftp_upload_file repeatedly.",
        inputSchema: {
          type: "object",
          properties: {
            localDir: { type: "string", description: "Absolute path to the local directory to upload." },
            remoteDir: { type: "string", description: "Path on the remote FTP server to upload into." }
          },
          required: ["localDir", "remoteDir"]
        }
      },
      {
        name: "ftp_file_exists",
        description: "Check whether a file or directory exists on the remote FTP server. Returns true or false.",
        inputSchema: {
          type: "object",
          properties: {
            remotePath: { type: "string", description: "Full path of the file or directory to check on the remote FTP server." }
          },
          required: ["remotePath"]
        }
      },
      {
        name: "http_request",
        description: "Make an HTTP GET or POST request to any URL. Use this to verify that a deployed PHP API endpoint responds correctly after uploading changes.",
        inputSchema: {
          type: "object",
          properties: {
            method: { type: "string", enum: ["GET", "POST"], description: "HTTP method: GET or POST." },
            url: { type: "string", description: "Full URL to request, e.g. https://oem.sncformer.com/MES/api/health.php" },
            body: { type: "object", description: "Optional JSON body for POST requests." },
            headers: { type: "object", description: "Optional HTTP headers to include." }
          },
          required: ["method", "url"]
        }
      },
      {
        name: "send_email",
        description: "Send an email notification using the project SMTP settings from .env. Use this to notify the user when a long-running task completes or an error occurs.",
        inputSchema: {
          type: "object",
          properties: {
            to: { type: "string", description: "Recipient email address. Defaults to EMAIL_TO_REPORT from .env if omitted." },
            subject: { type: "string", description: "Email subject line." },
            body: { type: "string", description: "Plain-text or HTML email body." }
          },
          required: ["subject", "body"]
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
SSMS (SQL Server): ${process.env.DB_SERVER} | DB: ${process.env.DB_DATABASE} | User: ${process.env.DB_USER} | Pass: ${process.env.DB_PASSWORD}
FTP (Filezilla): ftp://${FTP_USER}@${FTP_HOST}/ | User: ${FTP_USER} | Pass: ${FTP_PASS}
Node-RED: ${NODE_RED_URL}/ | User: ${NODE_RED_USER} | Pass: ${NODE_RED_PASS}
          `.trim()
        }]
      };
    }

    if (name === "get_project_rules") {
      try {
        const rules = await fs.readFile(path.join(__dirname, "../ProjectRules.md"), "utf-8");
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

        // Auto-create parent directories if they don't exist
        const lastSlashIndex = args.remotePath.lastIndexOf('/');
        if (lastSlashIndex > 0) {
          const remoteDir = args.remotePath.substring(0, lastSlashIndex);
          await client.ensureDir(remoteDir);
        }

        await client.uploadFrom(args.localPath, args.remotePath);
        return {
          content: [{ type: "text", text: `Successfully uploaded ${args.localPath} to ${args.remotePath}` }]
        };
      } finally {
        client.close();
      }
    }
    if (name === "ftp_download_file") {
      const client = new ftp.Client();
      try {
        await client.access({
          host: FTP_HOST,
          user: FTP_USER,
          password: FTP_PASS,
        });

        // Ensure the local directory exists before downloading
        const localDir = path.dirname(args.localPath);
        await fs.mkdir(localDir, { recursive: true });

        await client.downloadTo(args.localPath, args.remotePath);
        return {
          content: [{ type: "text", text: `Successfully downloaded ${args.remotePath} to ${args.localPath}` }]
        };
      } finally {
        client.close();
      }
    }

    if (name === "ftp_read_file") {
      const client = new ftp.Client();
      try {
        await client.access({
          host: FTP_HOST,
          user: FTP_USER,
          password: FTP_PASS,
        });

        // Stream file content directly into memory - no disk write needed
        const chunks = [];
        const passThrough = new PassThrough();
        passThrough.on("data", (chunk) => chunks.push(chunk));
        await client.downloadTo(passThrough, args.remotePath);
        const content = Buffer.concat(chunks).toString("utf-8");
        return {
          content: [{ type: "text", text: content }]
        };
      } finally {
        client.close();
      }
    }

    if (name === "ftp_delete_file") {
      const client = new ftp.Client();
      try {
        await client.access({
          host: FTP_HOST,
          user: FTP_USER,
          password: FTP_PASS,
        });
        await client.remove(args.remotePath);
        return {
          content: [{ type: "text", text: `Successfully deleted ${args.remotePath}` }]
        };
      } finally {
        client.close();
      }
    }

    if (name === "ftp_rename_file") {
      const client = new ftp.Client();
      try {
        await client.access({
          host: FTP_HOST,
          user: FTP_USER,
          password: FTP_PASS,
        });
        await client.rename(args.oldPath, args.newPath);
        return {
          content: [{ type: "text", text: `Successfully renamed ${args.oldPath} -> ${args.newPath}` }]
        };
      } finally {
        client.close();
      }
    }

    if (name === "nodered_update_flows") {
      const token = await getNodeRedToken();
      await axios.post(`${NODE_RED_URL}/flows`, args.flows, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Node-RED-Deployment-Type": "full"
        }
      });
      return {
        content: [{ type: "text", text: "Node-RED flows updated successfully. Changes are live." }]
      };
    }

    if (name === "ftp_upload_directory") {
      const client = new ftp.Client();
      const uploaded = [];

      // Recursively collect all files under localDir
      async function collectFiles(dir) {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            await collectFiles(fullPath);
          } else {
            uploaded.push(fullPath);
          }
        }
      }

      try {
        await collectFiles(args.localDir);
        await client.access({ host: FTP_HOST, user: FTP_USER, password: FTP_PASS });

        for (const localFile of uploaded) {
          const relativePath = path.relative(args.localDir, localFile).replace(/\\/g, "/");
          const remotePath = `${args.remoteDir.replace(/\/$/, "")}/${relativePath}`;
          const remoteFileDir = remotePath.substring(0, remotePath.lastIndexOf("/"));
          await client.ensureDir(remoteFileDir);
          await client.uploadFrom(localFile, remotePath);
        }

        return {
          content: [{ type: "text", text: `Uploaded ${uploaded.length} file(s) to ${args.remoteDir}.\n${uploaded.map(f => path.relative(args.localDir, f)).join("\n")}` }]
        };
      } finally {
        client.close();
      }
    }

    if (name === "ftp_file_exists") {
      const client = new ftp.Client();
      try {
        await client.access({ host: FTP_HOST, user: FTP_USER, password: FTP_PASS });
        const parentDir = args.remotePath.substring(0, args.remotePath.lastIndexOf("/")) || "/";
        const targetName = args.remotePath.substring(args.remotePath.lastIndexOf("/") + 1);
        const list = await client.list(parentDir);
        const exists = list.some(item => item.name === targetName);
        return {
          content: [{ type: "text", text: exists ? `EXISTS: ${args.remotePath}` : `NOT FOUND: ${args.remotePath}` }]
        };
      } finally {
        client.close();
      }
    }

    if (name === "http_request") {
      const config = {
        method: args.method,
        url: args.url,
        headers: args.headers || {},
        timeout: 15000,
        validateStatus: () => true, // Return response regardless of status code
      };
      if (args.method === "POST" && args.body) {
        config.data = args.body;
        config.headers["Content-Type"] = config.headers["Content-Type"] || "application/json";
      }
      const resp = await axios(config);
      const summary = `Status: ${resp.status} ${resp.statusText}\nBody: ${JSON.stringify(resp.data, null, 2)}`;
      return {
        content: [{ type: "text", text: summary }]
      };
    }

    if (name === "send_email") {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "ssl",
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      const recipient = args.to || process.env.EMAIL_TO_REPORT;
      await transporter.sendMail({
        from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
        to: recipient,
        subject: args.subject,
        html: args.body,
      });
      return {
        content: [{ type: "text", text: `Email sent to ${recipient}: "${args.subject}"` }]
      };
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
