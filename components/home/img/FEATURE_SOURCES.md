# Homepage feature screenshots

Captured on 2026-11-04 (UTC) from [LibreChat v0.8.9-rc1, commit f177bed1](https://github.com/danny-avila/LibreChat/tree/f177bed175b4b2a12236e751eb6467365b37f7c6).

The Agents images were revised on 2026-11-05 (Europe/Rome).

| Files                                                         | Content                                                                                | Dimensions  |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ----------- |
| `agents-research-light.webp`, `agents-research-dark.webp`     | Research analyst agent with instructions, Web Search, File Search, and Skills controls | 892 × 1034  |
| `artifacts-project-light.webp`, `artifacts-project-dark.webp` | Project overview dashboard inside the artifact preview                                 | 1226 × 1100 |

These are captures of the actual product components in matching light and dark themes, at a device scale factor of 2. The agent panel was cropped to the avatar, configuration, tools, and skills. The artifact panel was cropped to the preview toolbar, metrics, and complete chart.

Example users, agent settings, skills, conversations, and artifact HTML were supplied through browser-local API fixtures. The dashboard rendered inside the actual Sandpack preview. No live account data or model requests were used. Development controls were excluded. Images were encoded as WebP at quality 92.

The revised Agents images use the supplied `LibreChat-wide-margin.png` avatar, preserving its complete padded canvas, and display `gpt-6-astra` as demo configuration. They preview the requested upcoming toolbar arrangement: the actual add and expand controls were repositioned in the browser immediately left of Inline/Prompt, with the old empty toolbar row removed. Product source was unchanged; this placement is staged for the homepage and is not present in the source commit above.
