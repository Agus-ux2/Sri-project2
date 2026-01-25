/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * MCP SERVICE - Cliente para conectar con n8n MCP
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { SSEClientTransport } = require("@modelcontextprotocol/sdk/client/sse.js");
const env = require('../config/env');

class MCPService {
    constructor() {
        this.client = null;
        this.transport = null;
        this.isConnected = false;
        this.tools = [];
    }

    /**
     * Inicializa la conexión con el servidor MCP de n8n
     */
    async connect() {
        if (this.isConnected) return;

        const mcpUrl = env.N8N_MCP_URL;
        if (!mcpUrl) {
            console.warn('⚠️ N8N_MCP_URL no configurada. MCP Service desactivado.');
            return;
        }

        try {
            console.log(`🔌 Conectando a n8n MCP Server en: ${mcpUrl}`);

            this.transport = new SSEClientTransport(new URL(mcpUrl));
            this.client = new Client(
                {
                    name: "sri-backend-client",
                    version: "1.0.0",
                },
                {
                    capabilities: {
                        tools: {},
                    },
                }
            );

            await this.client.connect(this.transport);
            this.isConnected = true;
            console.log('✅ Conectado a n8n MCP Server correctamente.');

            // Cargar herramientas disponibles inicialmente
            await this.refreshTools();
        } catch (error) {
            console.error('❌ Error conectando a n8n MCP:', error.message);
            this.isConnected = false;
        }
    }

    /**
     * Obtiene la lista de herramientas del servidor n8n
     */
    async refreshTools() {
        if (!this.isConnected) return [];
        try {
            const response = await this.client.listTools();
            this.tools = response.tools || [];
            console.log(`🛠️ Herramientas n8n detectadas: ${this.tools.length}`);
            return this.tools;
        } catch (error) {
            console.error('Error listando herramientas n8n:', error);
            return [];
        }
    }

    /**
     * Ejecuta una herramienta de n8n (workflow)
     */
    async callTool(name, args = {}) {
        if (!this.isConnected) {
            throw new Error('MCP Service no está conectado.');
        }

        try {
            console.log(`🚀 Ejecutando herramienta n8n: ${name}`, args);
            const result = await this.client.callTool({
                name,
                arguments: args
            });
            return result;
        } catch (error) {
            console.error(`Error ejecutando herramienta ${name}:`, error);
            throw error;
        }
    }

    /**
     * Cierra la conexión
     */
    async disconnect() {
        if (this.transport) {
            await this.transport.close();
        }
        this.isConnected = false;
        console.log('🔌 Desconectado de n8n MCP.');
    }
}

// Exportar instancia única (Singleton)
module.exports = new MCPService();
