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

(Detailed usage instructions, such as configuring Cubox API Key and target Logseq page, to be added)

## Ref:

- <https://github.com/readwiseio/logseq-readwise-official-plugin>
- <https://plugins-doc.logseq.com/>
- <https://docs.logseq.com/#/page/Plugins%2001>
- <https://github.com/logseq/logseq-plugin-samples>
- <https://logseq.github.io/plugins/modules.html>
- <https://github.com/OLCUBO/obsidian-cubox>

