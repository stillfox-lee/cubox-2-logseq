# Cubox-2-Logseq Plugin

[简体中文](README_zh-CN.md)

This project aims to synchronize your collected articles, highlights, and notes from Cubox (read-it-later service) to Logseq.

## Features

- **Article Synchronization**: Sync your collected articles from Cubox to Logseq.
- **Highlight and Note Synchronization**: Synchronize highlights (annotations) and notes within articles, ensuring your reading annotations are not lost.
- **Incremental Synchronization**: Supports incremental synchronization based on the last synced article ID and update time, avoiding duplication and improving efficiency.
- **Folder-based Filtering**: Allows users to specify Cubox folders to sync, only importing articles from selected folders.
- **Annotated Articles Only**: Provides an option to sync only articles that contain highlights or notes, facilitating better management.
- **Automatic Page Creation**: If the target Logseq page does not exist, the plugin will automatically create it.

## How It Works

The plugin fetches your collected data via the Cubox API, converts it into a Logseq-compatible Markdown format, and then writes it to your specified Logseq page. It checks if an article already exists in Logseq to prevent duplicate imports.

## Usage

### Get Cubox API Key

1. Open https://cubox.pro/my/settings/extensions
2. Enable `API Extension`, get `Cubox domain` and `API Key` as shown in the image below:
   ![cubox-extend](./cubox-extend.png)

### Configure cubox-2-logseq Plugin

(Detailed configuration instructions for Cubox API Key and target Logseq page, to be added)

## Development

### Prerequisites

- [pnpm](https://pnpm.io/) - Fast, disk space efficient package manager
- Node.js

### Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/stillfox-lee/cubox-2-logseq.git
   cd cubox-2-logseq
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Build:
   ```bash
   pnpm build
   ```

4. Load plugin in Logseq:
    ```
    Settings -> Advanced -> Developer Mode
    Plugins -> Load unpacked plugin -> Choose the root dir of this project
    ```

## Acknowledgments

Thanks to the following projects and tools that helped make this project possible:

- [logseq-plugin-template-react](https://github.com/pengx17/logseq-plugin-template-react) - Thanks to [@pengx17](https://github.com/pengx17) for the excellent template
- [logseq-readwise-official-plugin](https://github.com/readwiseio/logseq-readwise-official-plugin) - Provided valuable reference and inspiration
- [obsidian-cubox](https://github.com/OLCUBO/obsidian-cubox) - Important reference for Cubox integration
- [Logseq](https://logseq.com/) - Thanks to this excellent knowledge management platform
- [Claude](https://claude.ai/) - This project was developed with Claude Code

## Ref:

- <https://github.com/readwiseio/logseq-readwise-official-plugin>
- <https://plugins-doc.logseq.com/>
- <https://docs.logseq.com/#/page/Plugins%2001>
- <https://github.com/logseq/logseq-plugin-samples>
- <https://logseq.github.io/plugins/modules.html>
- <https://github.com/OLCUBO/obsidian-cubox>

