# Cubox 到 Logseq 数据转换说明

本文档详细说明了项目中如何将 Cubox 数据转换为 Logseq 页面的过程。

## 概述

本项目通过 Cubox API 获取用户的收藏文章数据，并将其转换为 Logseq 页面格式，实现知识管理的无缝迁移。

## Cubox 数据模型

### CuboxArticle（文章）

```typescript
interface CuboxArticle {
    id: string;                // 文章唯一标识符
    title: string;             // 文章标题
    article_title: string;     // 文章原始标题
    description: string;       // 文章描述
    url: string;              // 原始 URL
    domain: string;           // 域名
    create_time: string;      // 创建时间
    update_time: string;      // 更新时间
    word_count: number;       // 字数统计
    content?: string;         // 文章内容（需要额外获取）
    cubox_url: string;        // Cubox 内部链接
    highlights?: CuboxHighlight[]; // 高亮标注
    tags?: string[];          // 标签
    type: string;             // 文章类型
}
```

### CuboxHighlight（高亮标注）

```typescript
interface CuboxHighlight {
    id: string;               // 高亮唯一标识符
    text: string;             // 高亮文本
    image_url?: string;       // 关联图片 URL
    cubox_url: string;        // Cubox 内部链接
    note?: string;            // 用户笔记
    color: string;            // 高亮颜色
    create_time: string;      // 创建时间
}
```

### CuboxFolder（文件夹）

```typescript
interface CuboxFolder {
    id: string;               // 文件夹 ID
    name: string;             // 文件夹名称
    nested_name: string;      // 嵌套路径名称
    uncategorized: boolean;   // 是否为未分类
}
```

## Logseq 页面结构

### 页面属性（Page Properties）

每个 Cubox 文章在 Logseq 中会创建一个独立的页面，页面属性包含以下元数据：

```yaml
cubox-url: "https://cubox.pro/c/xxx"     # Cubox 内部链接
original-url: "https://example.com"      # 原始文章 URL
domain: "example.com"                    # 文章域名
type: "article"                          # 文章类型
created-at: "2024-01-01 10:00"          # 创建时间
updated-at: "2024-01-01 12:00"          # 更新时间
tags: ["技术", "AI", "Cubox"]            # 标签（包含原始标签和目标页面名称）
```

### 页面内容结构

页面内容采用层级块结构：

```markdown
## Content
  - [文章正文内容]

## Highlights
  - > [高亮文本1]
    
    **Note:** [用户笔记]
    
    ![](image_url)  # 如果有关联图片
    
    *Created: 2024-01-01 10:00*
    
  - > [高亮文本2]
    
    *Created: 2024-01-01 11:00*
```

## 数据转换流程

### 1. 数据获取阶段

```typescript
// 1. 获取文章列表
const result = await cuboxApi.getArticles({
    lastCardId: lastCardId || null,
    lastCardUpdateTime: lastCardUpdateTime || null,
    folderFilter: folderFilter.length > 0 ? folderFilter : undefined,
    isAnnotated: settings.onlyAnnotated ? true : undefined
});

// 2. 获取文章详细内容
const content = await cuboxApi.getArticleDetail(article.id);
if (content) {
    article.content = content;
}
```

### 2. 页面标题生成

```typescript
function generatePageTitle(article: CuboxArticle): string {
    const title = article.title || article.article_title || "Untitled";
    
    // 清理标题，移除不支持的字符
    const sanitizedTitle = title
        .replace(/[<>:"/\\|?*]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .substring(0, 100);
    
    return sanitizedTitle;
}
```

### 3. 页面属性映射

| Cubox 字段 | Logseq 属性 | 转换说明 |
|-----------|-------------|----------|
| `cubox_url` | `cubox-url` | 直接映射 |
| `url` | `original-url` | 直接映射 |
| `domain` | `domain` | 直接映射 |
| `type` | `type` | 直接映射 |
| `create_time` | `created-at` | 格式化为 "yyyy-MM-dd HH:mm" |
| `update_time` | `updated-at` | 格式化为 "yyyy-MM-dd HH:mm" |
| `tags` | `tags` | 合并原始标签和目标页面名称 |

### 4. 内容块生成

#### 文章内容块

```typescript
if (article.content) {
    blocks.push({
        content: "## Content",
        children: [{ content: article.content }]
    });
}
```

#### 高亮块生成

```typescript
function generateHighlightBlock(highlight: CuboxHighlight): LogseqBlock {
    let content = `> ${highlight.text}`;
    
    if (highlight.note) {
        content += `\n\n**Note:** ${highlight.note}`;
    }
    
    if (highlight.image_url) {
        content += `\n\n![](${highlight.image_url})`;
    }
    
    content += `\n\n*Created: ${formatDate(highlight.create_time)}*`;
    
    return { content };
}
```

### 5. 页面关联

每个文章页面会自动链接到目标父页面：

```typescript
async function linkToParentPage(articlePageName: string, parentPageName: string) {
    // 在父页面中创建或找到 "## Recent Articles" 部分
    // 添加指向新文章页面的链接
    await logseq.Editor.insertBlock(
        recentArticlesBlock.uuid,
        `[[${articlePageName}]]`,
        { before: true }  // 按时间倒序排列
    );
}
```

## 同步策略

### 增量同步

- 使用 `lastCardId` 和 `lastCardUpdateTime` 实现增量同步
- 避免重复导入已存在的文章
- 支持分页获取大量数据

### 过滤选项

- **文件夹过滤**：只同步指定文件夹的文章
- **标注过滤**：只同步包含高亮标注的文章
- **标签过滤**：基于标签筛选文章

### 去重机制

```typescript
async function findExistingArticlePage(cuboxId: string) {
    const searchResults = await logseq.DB.q(`
        [:find (pull ?p [*])
         :where
         [?p :block/properties ?props]
         [(get ?props :cubox-id) ?id]
         [(= ?id "${cuboxId}")]]
    `);
    
    return searchResults && searchResults.length > 0 ? searchResults[0][0] : null;
}
```

## 配置选项

```typescript
interface CuboxSyncSettings {
    domain: string;              // Cubox 域名
    apiKey: string;              // API 密钥
    targetPageName: string;      // 目标父页面名称
    enableSync: boolean;         // 是否启用同步
    autoSync: boolean;           // 是否自动同步
    lastSyncTime: number;        // 上次同步时间
    lastSyncCardId: string;      // 上次同步的文章 ID
    lastSyncCardUpdateTime: string; // 上次同步的文章更新时间
    syncFolders: string;         // 同步的文件夹（逗号分隔）
    onlyAnnotated: boolean;      // 只同步有标注的文章
}
```

## 总结

通过这套数据转换机制，Cubox 中的文章数据能够完整地迁移到 Logseq 中，保持原有的结构和关联关系，同时利用 Logseq 的双向链接和块引用功能，为用户提供更强大的知识管理体验。

转换过程中特别注意了：
- 数据完整性：保留所有重要的元数据
- 结构化：采用清晰的层级结构组织内容
- 可搜索性：通过标签和属性提供多维度检索
- 关联性：通过页面链接维护文章间的关系
- 增量性：支持高效的增量同步机制