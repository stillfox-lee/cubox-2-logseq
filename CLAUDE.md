# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Logseq plugin that syncs articles, highlights, and notes from Cubox (a "read it later" service) into Logseq. The plugin is built with React, TypeScript, and uses the Logseq Plugin API.

## Development Commands

- **Start development server**: `pnpm dev` - Uses Vite with HMR for plugin development
- **Build for production**: `pnpm build` - Runs TypeScript compilation followed by Vite build
- **Type checking**: `tsc --noEmit` - Run TypeScript compiler for type checking only
- **Linting**: `npx eslint src/ --ext .ts,.tsx` - Run ESLint on TypeScript files

## Architecture

### Plugin Structure
- **Main entry**: `src/main.tsx` - Initializes the Logseq plugin, registers UI toolbar item with gear icon
- **React app**: `src/App.tsx` - Main UI component (currently shows welcome message)
- **API client**: `src/cuboxApi.ts` - Complete Cubox API integration with TypeScript interfaces
- **Modal system**: `src/modal/` - Selection modals for folders, tags, status, and content types

### Key Components
- `CuboxApi` class handles all API interactions (articles, folders, tags, content)
- Plugin registers as a toolbar item in Logseq with gear emoji (⚙️)
- Uses `@logseq/libs` for plugin API integration
- Built with `vite-plugin-logseq` for development workflow

### Data Models
- `CuboxArticle` - Article metadata with highlights and tags
- `CuboxHighlight` - Individual highlights with notes and colors  
- `CuboxFolder` - Folder structure with nested naming
- `CuboxTag` - Tag hierarchy with parent relationships

## Package Management

This project enforces pnpm usage via preinstall hook. Always use `pnpm` commands instead of npm/yarn.

## Build Configuration

- Uses Vite with React plugin and logseq development plugin
- TypeScript with strict mode enabled
- Targets ESNext with DOM libraries
- CSS processed with Tailwind and PostCSS