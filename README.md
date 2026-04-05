---
title: OpenClaw MAI Image Plugin
description: MAI-Image-2 plugin for OpenClaw using Azure AI Foundry and optional Blob URL delivery.
---

# OpenClaw MAI Image Plugin

MAI-Image-2 plugin for OpenClaw using Azure AI Foundry and optional Blob URL delivery.

## Overview

This plugin adds text-to-image generation to OpenClaw using Azure AI Foundry MAI-Image-2. It can return the generated image directly and optionally upload it to Azure Blob Storage so channels that prefer public HTTPS media URLs can render the output more reliably.

## Features

* MAI-Image-2 image generation for OpenClaw
* Azure AI Foundry integration
* Optional Azure Blob upload for public URL delivery
* Dimension validation for supported image sizes
* Regression tests for dimensions, blob signing, and API behavior

## Prerequisites

* An OpenClaw instance that supports local plugin loading
* Access to an Azure AI Foundry endpoint with a MAI-Image-2 deployment
* Optional Azure Blob Storage account if you want public URL delivery

## Repository Layout

* `index.js`: plugin entry point
* `lib/api.js`: image generation API client
* `lib/blob.js`: Azure Blob upload helper
* `lib/tool.js`: dimension validation helpers
* `test/`: regression tests for dimensions and blob behavior
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

## Installation

The exact plugin-loading workflow depends on your OpenClaw host, but the minimum setup is:

1. Copy this repository into a directory that your OpenClaw runtime can read.
2. Add the plugin to your OpenClaw plugin configuration.
3. Set the Azure AI Foundry endpoint and deployment name.
4. Provide the AI API key through your OpenClaw runtime configuration or environment.
5. If you need public URLs for generated images, also configure Azure Blob Storage.
6. Restart OpenClaw so the plugin is loaded.

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

## Testing

Run the plugin tests with:

```bash
npm test
```

## Limitations

* This plugin is intentionally Azure-specific.
* Public URL delivery depends on correctly configured Azure Blob Storage.
* Some channel delivery behaviors depend on the surrounding OpenClaw runtime.
* The public repository should document minimal Azure setup, but it should not copy the full private deployment infrastructure.

## Status

This is the first public extraction of the plugin from a private deployment repository. Additional packaging cleanup and broader installation guidance can be added over time.


