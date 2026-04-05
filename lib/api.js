const https = require("https");
const http = require("http");

/**
 * Call the MAI-Image-2 /mai/v1/images/generations endpoint.
 * Returns { b64_json } on success, throws on error.
 */
function generateImage({ endpoint, deploymentName, apiKey, prompt, width, height }) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${endpoint}/mai/v1/images/generations`);
    const body = JSON.stringify({
      model: deploymentName,
      prompt,
      width,
      height,
    });

    const transport = url.protocol === "https:" ? https : http;
    const req = transport.request(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey,
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString();
          let json;
          try {
            json = JSON.parse(text);
          } catch {
            return reject(new Error(`MAI-Image-2: invalid JSON response (HTTP ${res.statusCode})`));
          }
          if (res.statusCode !== 200) {
            const msg = json?.error?.message || JSON.stringify(json);
            return reject(new Error(`MAI-Image-2 HTTP ${res.statusCode}: ${msg}`));
          }
          if (!json.data?.[0]?.b64_json) {
            return reject(new Error("MAI-Image-2: response missing image data"));
          }
          resolve({ b64_json: json.data[0].b64_json });
        });
      },
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

module.exports = { generateImage };
