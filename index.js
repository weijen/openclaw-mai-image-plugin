const crypto = require("crypto");
const { generateImage } = require("./lib/api");
const { uploadToBlob } = require("./lib/blob");
const { sendTelegramPhoto } = require("./lib/delivery");

function normalizeOptionalValue(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (text.startsWith("__") && text.endsWith("__")) return "";
  if (text.startsWith("<") && text.endsWith(">")) return "";
  return text;
}

function normalizeChannel(value) {
  return String(value || "").trim().toLowerCase();
}

function buildResultContent({ channel, b64, publicUrl }) {
  const normalizedChannel = normalizeChannel(channel);
  const content = [{ type: "image", data: b64, mimeType: "image/png" }];

  if (publicUrl) {
    content.push({ type: "text", text: `Image URL: ${publicUrl}` });
  }

  return content;
}

function register(api) {
  const cfg = Object.assign(
    {
      endpoint: "",
      deploymentName: "mai-image-2",
      defaultWidth: 1024,
      defaultHeight: 1024,
      mediaStorageAccount: "",
      mediaStorageKey: "",
      mediaStorageContainer: "images",
    },
    api.pluginConfig || {},
  );

  cfg.mediaStorageAccount = normalizeOptionalValue(cfg.mediaStorageAccount);
  cfg.mediaStorageContainer = normalizeOptionalValue(cfg.mediaStorageContainer) || "images";

  // Resolve endpoint from config or provider settings
  if (!cfg.endpoint) {
    const provider =
      api.config?.models?.providers?.["azure-openai-responses"] || {};
    const base = provider.baseUrl || "";
    cfg.endpoint = base.replace(/\/openai\/v1\/?$/, "");
  }

  // Resolve API key at request time
  function resolveApiKey(runtimeCfg) {
    if (cfg.apiKey) return cfg.apiKey;
    const provider =
      (runtimeCfg || api.config)?.models?.providers?.["azure-openai-responses"] || {};
    if (provider.apiKey) return provider.apiKey;
    const headerKey = provider.headers?.["api-key"];
    if (headerKey) return headerKey;
    if (api.resolveSecret) {
      const secret = api.resolveSecret("azure-openai-api-key");
      if (secret) return secret;
    }
    return process.env.AZURE_OPENAI_API_KEY || "";
  }

  function resolveStorageKey() {
    const configured = normalizeOptionalValue(cfg.mediaStorageKey);
    if (configured && !configured.startsWith("__KEYVAULT__:")) return configured;
    if (api.resolveSecret) {
      const secret = api.resolveSecret("media-storage-key");
      if (secret) return secret;
    }
    return process.env.MEDIA_STORAGE_KEY || "";
  }

  // Register as a custom tool returning proper AgentToolResult with ImageContent.
  // This bypasses the image_generate core tool and directly returns the image.
  api.registerTool(
    (toolCtx) => ({
      name: "mai_image_generate",
      label: "mai_image_generate",
      description:
        "Generate an image from a text prompt using MAI-Image-2. " +
        "Returns the generated PNG image directly. Provide a detailed English prompt for best quality.",
      parameters: {
        type: "object",
        required: ["prompt"],
        properties: {
          prompt: { type: "string", description: "Detailed text description of the image to generate." },
          width: { type: "integer", description: "Image width in pixels (default 1024)." },
          height: { type: "integer", description: "Image height in pixels (default 1024)." },
        },
      },
      execute: async (_toolCallId, params) => {
        const apiKey = resolveApiKey(api.config);
        if (!apiKey) {
          return {
            content: [{ type: "text", text: "Error: MAI-Image-2 API key not found." }],
            details: { status: "error" },
          };
        }

        try {
          const result = await generateImage({
            endpoint: cfg.endpoint,
            deploymentName: cfg.deploymentName,
            apiKey,
            prompt: params.prompt,
            width: params.width || cfg.defaultWidth,
            height: params.height || cfg.defaultHeight,
          });

          const b64 = result.b64_json;
          const buffer = Buffer.from(b64, "base64");
          const channel = normalizeChannel(toolCtx?.messageChannel);

          // Telegram: send photo directly via Bot API for native inline image.
          if (channel === "telegram") {
            const botToken = api.config?.channels?.telegram?.botToken;
            const dc = toolCtx?.deliveryContext;
            // deliveryContext.to has format "telegram:CHAT_ID" — strip prefix
            const rawTo = dc?.to || "";
            const chatId = rawTo.replace(/^telegram:/i, "").trim();
            if (botToken && chatId) {
              try {
                await sendTelegramPhoto({ botToken, chatId, buffer });
                api.logger?.info?.(`mai-image: sent photo to telegram chat=${chatId}`);
                return {
                  content: [{ type: "text", text: "Image generated and delivered as a photo." }],
                  details: { status: "ok", delivery: "telegram-direct", size: buffer.length },
                };
              } catch (err) {
                api.logger?.warn?.(`mai-image: telegram sendPhoto failed (${err.message}), falling back to blob`);
              }
            }
          }

          // Other channels (WhatsApp, LINE, etc.) or Telegram fallback:
          // upload to Azure Blob Storage for a public URL.
          let publicUrl = "";
          const storageKey = resolveStorageKey();
          if (cfg.mediaStorageAccount && storageKey) {
            try {
              const blobName = `${Date.now()}-${crypto.randomUUID()}.png`;
              publicUrl = await uploadToBlob({
                accountName: cfg.mediaStorageAccount,
                accountKey: storageKey,
                containerName: cfg.mediaStorageContainer,
                blobName,
                buffer,
                contentType: "image/png",
              });
              api.logger?.info?.(`mai-image: uploaded to ${publicUrl}`);
            } catch (err) {
              api.logger?.warn?.(`mai-image: blob upload failed (${err.message})`);
            }
          }

          const content = buildResultContent({
            channel,
            b64,
            publicUrl,
          });

          return { content, details: { status: "ok", publicUrl, size: buffer.length } };
        } catch (err) {
          return {
            content: [{ type: "text", text: `Image generation failed: ${err.message}` }],
            details: { status: "error", error: err.message },
          };
        }
      },
    }),
  );

  api.on(
    "before_prompt_build",
    () => ({
      appendSystemContext:
        "You have a mai_image_generate tool that generates images from text prompts using MAI-Image-2. " +
        "When the user asks you to generate, create, or draw an image, use this tool. " +
        "Provide a detailed English prompt for best results. " +
        "After calling the tool: if the result says the image was delivered as a photo, just confirm briefly — the user already received it. " +
        "If the result contains a URL (starting with https://), include EXACTLY that URL in your reply so the user can view the image. " +
        "NEVER fabricate or guess image URLs. Only use URLs that appear verbatim in the tool result.",
    }),
    { priority: 20 },
  );

  const blobStatus = cfg.mediaStorageAccount ? `blob=${cfg.mediaStorageAccount}` : "blob=disabled";
  api.logger?.info?.(
    `mai-image plugin ready: endpoint=${cfg.endpoint}, deployment=${cfg.deploymentName}, ${blobStatus}`,
  );
}

module.exports = register;
module.exports._internals = {
  generateImage,
  uploadToBlob,
  sendTelegramPhoto,
  normalizeOptionalValue,
  normalizeChannel,
  buildResultContent,
};
