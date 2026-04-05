const { generateImage } = require("./api");

/**
 * Validate and clamp image dimensions per MAI-Image-2 constraints:
 *   - Both width and height >= 768
 *   - width * height <= 1,048,576
 */
function validateDimensions(w, h) {
  const MAX_PIXELS = 1_048_576;
  const MIN_DIM = 768;
  let width = Math.max(MIN_DIM, Math.round(w || 1024));
  let height = Math.max(MIN_DIM, Math.round(h || 1024));
  if (width * height > MAX_PIXELS) {
    // Scale down proportionally
    const scale = Math.sqrt(MAX_PIXELS / (width * height));
    width = Math.max(MIN_DIM, Math.floor(width * scale));
    height = Math.max(MIN_DIM, Math.floor(height * scale));
  }
  return { width, height };
}

function createImageTool(toolCtx, state) {
  return {
    description:
      "Generate an image from a text prompt using MAI-Image-2. " +
      "Returns a PNG image. Provide a detailed prompt in English for best quality.",
    parameters: {
      type: "object",
      required: ["prompt"],
      properties: {
        prompt: {
          type: "string",
          description: "Detailed text description of the image to generate (English recommended).",
        },
        width: {
          type: "integer",
          description: "Image width in pixels (min 768, default 1024).",
        },
        height: {
          type: "integer",
          description: "Image height in pixels (min 768, default 1024).",
        },
      },
    },
    execute: async (params) => {
      const { cfg, apiKey } = state;

      if (!cfg.endpoint) {
        return { error: "MAI-Image plugin: endpoint not configured." };
      }
      if (!apiKey) {
        return { error: "MAI-Image plugin: API key not available." };
      }

      const { width, height } = validateDimensions(
        params.width || cfg.defaultWidth,
        params.height || cfg.defaultHeight,
      );

      try {
        const result = await generateImage({
          endpoint: cfg.endpoint,
          deploymentName: cfg.deploymentName,
          apiKey,
          prompt: params.prompt,
          width,
          height,
        });

        return {
          media: [
            {
              type: "image/png",
              data: result.b64_json,
              encoding: "base64",
            },
          ],
          text: `Generated ${width}×${height} image.`,
        };
      } catch (err) {
        return { error: `Image generation failed: ${err.message}` };
      }
    },
  };
}

module.exports = { createImageTool, validateDimensions };
