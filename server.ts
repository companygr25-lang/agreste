import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Configure high body limit to support parsing large extracted texts
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Dynamic Gemini Client initialization as recommended (Lazy & safe if key is missing)
  let ai: GoogleGenAI | null = null;
  const getGeminiClient = (): GoogleGenAI => {
    if (!ai) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY environment variable is not configured in Secrets / environment.");
      }
      ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
    return ai;
  };

  // API Check Endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Agreste API Server running successfully" });
  });

  // Helper function to handle generation with retries and fallback models
  const generateContentWithFallback = async (genAI: GoogleGenAI, params: { contents: any; config: any }) => {
    const modelsToTry = ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-1.5-flash", "gemini-3.1-flash-lite"];
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      let attempts = 3;
      let delay = 1500; // Initial delay for exponential backoff

      for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
          console.log(`[Import] Tentativa ${attempt}/${attempts} usando o modelo "${modelName}"...`);
          const response = await genAI.models.generateContent({
            model: modelName,
            contents: params.contents,
            config: params.config,
          });
          return response;
        } catch (err: any) {
          lastError = err;
          const errMsg = String(err?.message || err);
          console.error(`[Import Error] Erro na tentativa ${attempt} do modelo "${modelName}":`, errMsg);

          // Detect transient errors like 503 (high demand), 429 (rate limits), or Server Overloaded
          const isTransient = 
            errMsg.includes("503") || 
            errMsg.includes("UNAVAILABLE") || 
            errMsg.includes("high demand") || 
            errMsg.includes("429") || 
            errMsg.includes("ResourceExhausted") || 
            errMsg.includes("overloaded");

          if (isTransient && attempt < attempts) {
            console.warn(`[Import Retry] Erro temporário detectado. Aguardando ${delay}ms antes de tentar novamente...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            delay *= 2; // Exponential backoff
          } else {
            // Not transient, or reached maximum retries for this model
            break;
          }
        }
      }
      console.warn(`[Import Fallback] Tentativas esgotadas para o modelo "${modelName}". Avançando para o modelo alternativo de segurança...`);
    }

    throw lastError || new Error("Todos os modelos de extração via IA falharam ou estão sobrecarregados.");
  };

  // AI-Assisted Structured Client Extraction Endpoint
  app.post("/api/extract-clients", async (req, res) => {
    try {
      const { fileText, fileName, fileExt } = req.body;
      
      if (!fileText || String(fileText).trim() === "") {
        return res.status(400).json({ error: "Nenhum conteúdo textual foi detectado no arquivo selecionado." });
      }

      console.log(`[Import] Processando arquivo "${fileName}" com extensão ".${fileExt}" (${fileText.length} caracteres) via IA de segurança...`);

      // Initialize Gemini Client
      const genAI = getGeminiClient();

      const prompt = `Analise o seguinte conteúdo textual extraído do arquivo "${fileName}" (extensão .${fileExt}) que contém uma lista/cadastro de clientes e converta-a em uma lista estruturada em JSON com 100% de integridade e precisão.

Texto extraído do documento:
-----------------------------------------
${fileText}
-----------------------------------------

Por favor, faça um mapeamento inteligente focando em extraí-los com exatidão máxima baseado nas seguintes regras:
1. "name" (Obrigatório - Nome fantasia, Razão Social ou Nome do Cliente)
2. "city" (Obrigatório - Cidade do cliente, ex: "Caruaru", "Bezerros", etc. Caso não seja possível identificar no texto, utilize "Caruaru")
3. "responsible" (Obrigatório - Contato ou Pessoa responsável no local. Caso desconhecido, use "Coordenador")
4. "phone" (Obrigatório - WhatsApp, fone ou contato. Se vazio ou inexistente, use "(81) 99000-0000")
5. "size" (Obrigatório - Porte físico do local. Estime de forma correta: "grande" para indústrias, galpões, comércios médios/grandes, mercados, hipermercados e grandes escolas. Use "pequeno" para residências, apartamentos, pequenas salas comerciais, padarias de bairro ou clínicas de pequeno porte.)

Atenção: A extração precisa ser o mais fiel possível ao texto, sem omitir registros legítimos.`;

      const response = await generateContentWithFallback(genAI, {
        contents: prompt,
        config: {
          systemInstruction: "Você é um assistente cirúrgico de processamento de bancos de dados da empresa de dedetização Agreste. Sua única tarefa é ler o texto do documento e convertê-lo em um array JSON perfeitamente estruturado de novos cadastros de clientes com 100% de fidelidade aos registros existentes no documento, limpando nomes, padronizando telefones e estimando de forma inteligente o porte físico.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            description: "Lista completa de clientes extraídos de forma fiel e auditada",
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: "Nome ou Razão Social do cliente" },
                city: { type: Type.STRING, description: "Cidade aproximada do estabelecimento. Default é Caruaru." },
                responsible: { type: Type.STRING, description: "Responsável ou ponto de contato. Default é Coordenador." },
                phone: { type: Type.STRING, description: "Telefone formatado ou celular. Default é (81) 99000-0000." },
                size: { type: Type.STRING, enum: ["grande", "pequeno"], description: "Porte físico ou tamanho do cliente" }
              },
              required: ["name", "city", "responsible", "phone", "size"]
            }
          }
        }
      });

      const extractedJsonText = response.text || "[]";
      let clients = [];
      try {
        clients = JSON.parse(extractedJsonText);
      } catch (parseError) {
        console.error("[Import] Falha ao analisar o JSON gerado pelo Gemini:", extractedJsonText);
        // Fallback robusto de segurança: tentar limpar marcações markdown
        const cleanedStr = extractedJsonText.replace(/```json/g, "").replace(/```/g, "").trim();
        clients = JSON.parse(cleanedStr);
      }

      console.log(`[Import] IA concluiu a extração. Foram estruturados ${clients.length} clientes com sucesso!`);
      return res.json({ success: true, clients });
    } catch (error: any) {
      console.error("[Import Error] Falha geral de extração de clientes:", error);
      return res.status(500).json({ 
        success: false, 
        error: error.message || "Erro desconhecido ao processar documento com IA." 
      });
    }
  });

  // Enable static asset serving or Vite middleware
  if (process.env.NODE_ENV !== "production") {
    console.log("[Server] Running in DEVELOPMENT mode. Initializing Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("[Server] Running in PRODUCTION mode. Serving pre-compiled static assets...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Agreste Full-Stack Server available at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("[Server] Critical error starting server:", err);
});
