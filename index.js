const crypto = require("crypto");
const { generateImage } = require("./lib/api");
const { uploadToBlob } = require("./lib/blob");

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
    if (cfg.mediaStorageKey) return cfg.mediaStorageKey;
    if (api.resolveSecret) {
      const secret = api.resolveSecret("media-storage-key");
      if (secret) return secret;
    }
    return process.env.MEDIA_STORAGE_KEY || "";
  }

  // Register as a custom tool returning proper AgentToolResult with ImageContent.
  // This bypasses the image_generate core tool and directly returns the image.
  api.registerTool(
    {
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
          let publicUrl = "";

          // Upload to blob for public URL delivery
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

          const content = [
            { type: "image", data: b64, mimeType: "image/png" },
          ];
          if (publicUrl) {
            content.push({ type: "text", text: `Image generated and available at: ${publicUrl}` });
          } else {
            content.push({ type: "text", text: `Image generated (${buffer.length} bytes).` });
          }

          return { content, details: { status: "ok", publicUrl, size: buffer.length } };
        } catch (err) {
          return {
            content: [{ type: "text", text: `Image generation failed: ${err.message}` }],
            details: { status: "error", error: err.message },
          };
        }
      },
    },
  );

  api.on(
    "before_prompt_build",
    () => ({
      appendSystemContext:
        "You have a mai_image_generate tool that generates images from text prompts using MAI-Image-2. " +
        "When the user asks you to generate, create, or draw an image, use this tool. " +
        "Provide a detailed English prompt for best results. " +
        "IMPORTANT: After calling the tool, the result will contain a public URL starting with https://. " +
        "You MUST include this URL in your reply text so the user can view the image. " +
        "Format: show the URL on its own line so it renders as a clickable link.",
    }),
    { priority: 20 },
  );

  const blobStatus = cfg.mediaStorageAccount ? `blob=${cfg.mediaStorageAccount}` : "blob=disabled";
  api.logger?.info?.(
    `mai-image plugin ready: endpoint=${cfg.endpoint}, deployment=${cfg.deploymentName}, ${blobStatus}`,
  );
}

module.exports = register;
module.exports._internals = { generateImage, uploadToBlob };
