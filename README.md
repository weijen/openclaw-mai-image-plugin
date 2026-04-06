---
title: OpenClaw MAI Image Plugin
description: MAI-Image-2 plugin for OpenClaw using Azure AI Foundry and optional Blob URL delivery.
---

# OpenClaw MAI Image Plugin

MAI-Image-2 plugin for OpenClaw using Azure AI Foundry and optional Blob URL delivery.

## Overview

This plugin adds text-to-image generation to OpenClaw using Azure AI Foundry MAI-Image-2. It uses channel-aware delivery:

* **Telegram:** sends generated photos directly via the Bot API `sendPhoto` endpoint for native inline images
* **Other channels (WhatsApp, LINE, etc.):** uploads images to Azure Blob Storage and returns a public HTTPS URL that the LLM includes in its reply

## Compatibility

This repository targets OpenClaw environments that can:

* Load local plugins from a filesystem path
* Pass provider configuration into the plugin runtime
* Return image tool results to the calling channel

Because media delivery behavior varies by channel and OpenClaw version, validate the plugin on the channels you care about before production use.

## Features

* MAI-Image-2 image generation for OpenClaw
* Azure AI Foundry integration
* Channel-aware delivery: Telegram direct photo, other channels via Blob URL
* Dimension validation for supported image sizes
* Regression tests for dimensions, blob signing, delivery, and API behavior

## Prerequisites

* An OpenClaw instance that supports local plugin loading
* Access to an Azure AI Foundry endpoint with a MAI-Image-2 deployment
* Optional Azure Blob Storage account if you want public URL delivery

## Repository Layout

* `index.js`: plugin entry point (uses `registerTool` with factory function pattern)
* `lib/api.js`: image generation API client
* `lib/blob.js`: Azure Blob upload helper
* `lib/delivery.js`: Telegram Bot API `sendPhoto` helper
* `lib/tool.js`: dimension validation helpers
* `test/`: regression tests for dimensions, blob, delivery, and tool behavior
* `openclaw.plugin.json`: plugin manifest and configuration schema

## Configuration

See [example-config.json](./example-config.json) for a minimal configuration example.

Supported plugin configuration keys:

* `endpoint`: Azure AI Foundry endpoint URL
* `deploymentName`: deployed MAI-Image-2 model name
* `defaultWidth`: default image width in pixels
* `defaultHeight`: default image height in pixels
* `mediaStorageAccount`: Azure Blob Storage account name for public URL uploads
* `mediaStorageKey`: Azure Blob Storage key
* `mediaStorageContainer`: blob container name used for generated images

## Authentication

The plugin is designed to resolve credentials at runtime instead of hardcoding secrets in the repository.

Typical runtime sources are:

* OpenClaw model provider configuration
* Plugin configuration values
* Environment variables exposed to the OpenClaw process

For public usage, prefer environment or host-secret injection instead of storing keys directly in checked-in config files.

## Installation

The exact plugin-loading workflow depends on your OpenClaw host, but the minimum setup is:

1. Copy this repository into a directory that your OpenClaw runtime can read.
2. Add the plugin to your OpenClaw plugin configuration.
3. Set the Azure AI Foundry endpoint and deployment name.
4. Provide the AI API key through your OpenClaw runtime configuration or environment.
5. If you need public URLs for generated images, also configure Azure Blob Storage.
6. Restart OpenClaw so the plugin is loaded.

For Telegram, the plugin sends photos directly via the Bot API, so Blob Storage is optional (used only as fallback). For WhatsApp, LINE, and other channels that expect public media URLs, Blob Storage is required for reliable image delivery.

## OpenClaw Configuration Example

```json
{
	"plugins": {
		"allow": ["mai-image"],
		"entries": {
			"mai-image": {
				"enabled": true,
				"config": {
					"endpoint": "https://<resource>.cognitiveservices.azure.com",
					"deploymentName": "mai-image-2",
					"defaultWidth": 1024,
					"defaultHeight": 1024,
					"mediaStorageAccount": "<storage-account>",
					"mediaStorageKey": "<storage-key>",
					"mediaStorageContainer": "images"
				}
			}
		},
		"load": {
			"paths": ["/absolute/path/to/openclaw-mai-image-plugin"]
		}
	}
}
```

## Usage Notes

This plugin works best when prompts sent to the image tool are concrete and visually descriptive. In practice:

* Prefer explicit subject, style, lighting, and composition details
* Use default dimensions unless your hosting environment needs a different aspect ratio
* Treat Blob upload as a delivery feature, not a generation requirement

## What This Repository Does Not Include

This public repository contains the plugin runtime, tests, and configuration examples. It does not include:

* Full Azure deployment templates for the private production environment
* VM provisioning scripts
* Key Vault automation
* Network or domain setup

## Testing

Run the plugin tests with:

```bash
npm test
```

## Development

Useful local commands:

```bash
npm test
```

Key files to inspect when modifying behavior:

* `lib/api.js` for MAI-Image-2 API calls
* `lib/blob.js` for Blob upload and signing behavior
* `lib/delivery.js` for Telegram Bot API direct photo delivery
* `lib/tool.js` for dimension validation

## Limitations

* This plugin is intentionally Azure-specific.
* Public URL delivery depends on correctly configured Azure Blob Storage.
* Some channel delivery behaviors depend on the surrounding OpenClaw runtime.
* The public repository should document minimal Azure setup, but it should not copy the full private deployment infrastructure.

## Status

This is the first public extraction of the plugin from a private deployment repository. Additional packaging cleanup and broader installation guidance can be added over time.


