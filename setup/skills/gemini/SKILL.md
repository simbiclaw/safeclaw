---
name: gemini
description: Use Gemini CLI for web research, multimodal tasks (PDFs, images), or as a second opinion.
---

# Gemini CLI

Use Gemini for web research, multimodal tasks (PDFs, images), or as a second opinion.

## Usage

```bash
HTTPS_PROXY=$GEMINI_PROXY HTTP_PROXY=$GEMINI_PROXY gemini --yolo --model ${GEMINI_MODEL:-gemini-2.5-pro} --prompt "Your task"
```

If GEMINI_PROXY is empty, omit the proxy prefix:

```bash
gemini --yolo -m ${GEMINI_MODEL:-gemini-2.5-pro} --prompt "Your task"
```


## Examples

Reddit research:
```bash
HTTPS_PROXY=$GEMINI_PROXY HTTP_PROXY=$GEMINI_PROXY gemini -y -m $GEMINI_MODEL -p "Research what people on Reddit say about Claude Code"
```

Analyze an image:
```bash
HTTPS_PROXY=$GEMINI_PROXY HTTP_PROXY=$GEMINI_PROXY gemini -y -m $GEMINI_MODEL -p "Describe this image: /path/to/image.png"
```

Analyze a PDF:
```bash
HTTPS_PROXY=$GEMINI_PROXY HTTP_PROXY=$GEMINI_PROXY gemini -y -m $GEMINI_MODEL -p "Summarize this PDF: /path/to/doc.pdf"
```

## Notes

- File writes only work in current directory (not /tmp)
- Requires GEMINI_API_KEY env var
- GEMINI_PROXY and GEMINI_MODEL are set via `./scripts/setup-gemini.sh`
