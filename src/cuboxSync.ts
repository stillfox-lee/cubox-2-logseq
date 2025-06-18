import { CuboxApi, CuboxArticle, CuboxHighlight } from "./cuboxApi";

export interface CuboxSyncSettings {
    domain: string;
    apiKey: string;
    targetPageName: string;
    enableSync: boolean;
    autoSync: boolean;
    lastSyncTime: number;
    lastSyncCardId: string;
    lastSyncCardUpdateTime: string;
    // Sync rule options
    syncFolders: string; // Comma-separated folder names, empty means all folders
    onlyAnnotated: boolean; // Only sync articles with highlights/annotations
}

export interface SyncResult {
    syncedCount: number;
    skippedCount: number;
    errorCount: number;
    lastCardId?: string;
    lastCardUpdateTime?: string;
}

export interface LogseqBlock {
    content: string;
    children?: LogseqBlock[];
}

export function getDefaultSettings(): CuboxSyncSettings {
    return {
        domain: "",
        apiKey: "",
        targetPageName: "Cubox",
        enableSync: false,
        autoSync: false,
        lastSyncTime: 0,
        lastSyncCardId: "",
        lastSyncCardUpdateTime: "",
        syncFolders: "",
        onlyAnnotated: false
    };
}

/**
 * Get folder IDs from folder names
 */
async function getFolderIdsByNames(cuboxApi: CuboxApi, folderNames: string[]): Promise<string[]> {
    if (folderNames.length === 0) {
        return [];
    }

    try {
        const folders = await cuboxApi.getFolders();
        console.log('Available folders from API:', folders.map(f => ({ id: f.id, name: f.name, nested_name: f.nested_name })));
        const folderIds: string[] = [];

        for (const folderName of folderNames) {
            const folder = folders.find(f =>
                f.name.toLowerCase() === folderName.toLowerCase().trim() ||
                f.nested_name.toLowerCase() === folderName.toLowerCase().trim()
            );
            if (folder) {
                console.log(`Found folder "${folderName}" with ID: ${folder.id}`);
                folderIds.push(folder.id);
            } else {
                console.warn(`Folder not found: ${folderName}`);
            }
        }

        return folderIds;
    } catch (error) {
        console.error("Failed to fetch folders:", error);
        return [];
    }
}

/**
 * Main sync function that fetches Cubox data and saves to Logseq
 */
export async function syncCuboxToLogseq(
    settings: CuboxSyncSettings,
    setNotification?: (message: string) => void
): Promise<SyncResult> {
    const cuboxApi = new CuboxApi(settings.domain, settings.apiKey);

    let syncedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    let lastCardId = settings.lastSyncCardId;
    let lastCardUpdateTime = settings.lastSyncCardUpdateTime;
    let hasMore = true;

    // Ensure target page exists
    await ensureTargetPage(settings.targetPageName);

    // Prepare sync filters
    let folderFilter: string[] = [];
    if (settings.syncFolders.trim()) {
        const folderNames = settings.syncFolders.split(',').map(name => name.trim()).filter(name => name);
        console.log('Sync settings - syncFolders:', settings.syncFolders);
        console.log('Parsed folder names:', folderNames);
        setNotification?.("Getting folder information...");
        folderFilter = await getFolderIdsByNames(cuboxApi, folderNames);
        console.log('Resolved folder IDs:', folderFilter);

        if (folderNames.length > 0 && folderFilter.length === 0) {
            throw new Error(`No folders found matching: ${folderNames.join(', ')}`);
        }
    }

    setNotification?.("Fetching articles from Cubox...");

    // Fetch articles in pages
    while (hasMore) {
        try {
            console.log('Sync settings - onlyAnnotated:', settings.onlyAnnotated);
            console.log('Passing folderFilter to API:', folderFilter.length > 0 ? folderFilter : undefined);
            const result = await cuboxApi.getArticles({
                lastCardId: lastCardId || null,
                lastCardUpdateTime: lastCardUpdateTime || null,
                folderFilter: folderFilter.length > 0 ? folderFilter : undefined,
                isAnnotated: settings.onlyAnnotated ? true : undefined
            });

            const { articles, hasMore: moreArticles } = result;
            hasMore = moreArticles;

            if (articles.length === 0) {
                break;
            }

            setNotification?.(`Processing ${articles.length} articles...`);

            for (const article of articles) {
                try {
                    // Check if article already exists in Logseq
                    const existingPage = await findExistingArticlePage(article.id);
                    if (existingPage) {
                        // Check if Cubox article is newer than existing page
                        const pageUpdateTime = existingPage.properties?.['updated-at'];
                        const cuboxUpdateTime = article.update_time;
                        
                        if (pageUpdateTime && cuboxUpdateTime) {
                            const pageDate = new Date(pageUpdateTime);
                            const cuboxDate = new Date(cuboxUpdateTime);
                            
                            if (cuboxDate > pageDate) {
                                // Cubox data is newer, perform incremental update
                                await updateExistingArticlePage(existingPage, article, cuboxApi);
                                syncedCount++;
                            } else {
                                skippedCount++;
                            }
                        } else {
                            skippedCount++;
                        }
                        continue;
                    }

                    // Get article content if needed
                    const content = await cuboxApi.getArticleDetail(article.id);
                    if (content) {
                        article.content = content;
                    }

                    // Create page for this article
                    await createArticlePage(article, settings.targetPageName);
                    syncedCount++;

                } catch (error) {
                    console.error(`Failed to sync article ${article.id}:`, error);
                    errorCount++;
                }
            }

            // Update pagination info
            if (articles.length > 0) {
                lastCardId = articles[articles.length - 1].id;
                lastCardUpdateTime = articles[articles.length - 1].update_time;
            }

        } catch (error) {
            console.error("Failed to fetch articles:", error);
            throw error;
        }
    }

    return {
        syncedCount,
        skippedCount,
        errorCount,
        lastCardId,
        lastCardUpdateTime
    };
}

/**
 * Ensure the target page exists
 */
async function ensureTargetPage(pageName: string): Promise<void> {
    const page = await logseq.Editor.getPage(pageName);
    if (!page) {
        await logseq.Editor.createPage(pageName, {}, { createFirstBlock: false });
    }
}

/**
 * Find existing article page by Cubox ID
 */
async function findExistingArticlePage(cuboxId: string): Promise<any> {
    // Search for pages with this Cubox ID in properties
    const searchResults = await logseq.DB.q(`
    [:find (pull ?p [*])
     :where
     [?p :block/properties ?props]
     [(get ?props :cubox-id) ?id]
     [(= ?id "${cuboxId}")]]
  `);

    return searchResults && searchResults.length > 0 ? searchResults[0][0] : null;
}

/**
 * Update existing article page with full content replacement (except cubox-id)
 */
async function updateExistingArticlePage(existingPage: any, article: CuboxArticle, cuboxApi: CuboxApi): Promise<void> {
    try {
        // Get article content if needed
        const content = await cuboxApi.getArticleDetail(article.id);
        if (content) {
            article.content = content;
        }
        
        // Preserve the original cubox-id from existing page
        const originalCuboxId = existingPage.properties?.['cubox-id'] || article.id;
        const parentPageName = "Cubox"; // Default parent page name
        
        // Generate updated properties using the common function
        const updatedProperties = generatePageProperties(article, parentPageName, originalCuboxId);
        
        // Update all properties
        for (const [key, value] of Object.entries(updatedProperties)) {
            await logseq.Editor.upsertBlockProperty(existingPage.uuid, key, value);
        }
        
        // Get current page blocks and remove all content blocks (keep only page properties)
        const pageBlocks = await logseq.Editor.getPageBlocksTree(existingPage.name);
        
        // Remove all existing content blocks
        for (const block of pageBlocks) {
            if ('uuid' in block && block.uuid) {
                await logseq.Editor.removeBlock(block.uuid);
            }
        }
        
        // Generate and insert new blocks for the article content
        const blocks = generateArticleBlocks(article);
        
        if (blocks.length > 0) {
            // Insert the first block
            const firstBlock = await logseq.Editor.insertBlock(
                existingPage.name,
                blocks[0].content,
                { before: false, isPageBlock: true }
            );
            
            if (!firstBlock) {
                throw new Error("Failed to insert first block");
            }
            
            // Insert remaining blocks
            if (blocks.length > 1) {
                const batchBlocks = blocks.slice(1).map(block => ({
                    content: block.content,
                    children: block.children || []
                }));
                
                await logseq.Editor.insertBatchBlock(firstBlock.uuid, batchBlocks, { sibling: true });
            }
        }
        
        console.log(`Fully updated existing page: ${existingPage.name}`);
    } catch (error) {
        console.error(`Failed to update existing page ${existingPage.name}:`, error);
        throw error;
    }
}

/**
 * Create a Logseq page for a Cubox article
 */
async function createArticlePage(article: CuboxArticle, parentPageName: string): Promise<void> {
    // Generate page title
    const pageTitle = generatePageTitle(article);

    // Prepare page properties using the common function
    const pageProperties = generatePageProperties(article, parentPageName);

    // Create the page
    const page = await logseq.Editor.createPage(pageTitle, pageProperties, { createFirstBlock: false });

    if (!page) {
        throw new Error(`Failed to create page: ${pageTitle}`);
    }

    // Generate blocks for the article content
    const blocks = generateArticleBlocks(article);

    if (blocks.length > 0) {
        // Insert the first block
        const firstBlock = await logseq.Editor.insertBlock(
            page.originalName,
            blocks[0].content,
            { before: false, isPageBlock: true }
        );

        if (!firstBlock) {
            throw new Error("Failed to insert first block");
        }

        // Insert remaining blocks
        if (blocks.length > 1) {
            const batchBlocks = blocks.slice(1).map(block => ({
                content: block.content,
                children: block.children || []
            }));

            await logseq.Editor.insertBatchBlock(firstBlock.uuid, batchBlocks, { sibling: true });
        }
    }

    // Link to parent page
    await linkToParentPage(page.originalName, parentPageName);
}

/**
 * Generate a suitable page title for the article
 */
function generatePageTitle(article: CuboxArticle): string {
    const title = article.title || article.article_title || "Untitled";

    // Sanitize title for Logseq page name
    const sanitizedTitle = title
        .replace(/[<>:"/\\|?*]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .substring(0, 100);

    return sanitizedTitle;
}

/**
 * Generate page properties for Logseq page
 */
function generatePageProperties(article: CuboxArticle, parentPageName: string, preserveCuboxId?: string): Record<string, any> {
    const pageProperties: Record<string, any> = {
        "cubox-id": preserveCuboxId || article.id,
        "cubox-url": article.cubox_url,
        "original-url": article.url,
        "domain": article.domain,
        "type": article.type,
        "created-at": formatDate(article.create_time),
        "updated-at": formatDate(article.update_time)
    };

    // Initialize tags array and add existing tags if any
    pageProperties.tags = article.tags && article.tags.length > 0 ? [...article.tags] : [];
    
    // Add parent page name to tags if not already present
    if (!pageProperties.tags.includes(parentPageName)) {
        pageProperties.tags.push(parentPageName);
    }

    return pageProperties;
}

/**
 * Generate Logseq blocks from article content
 */
function generateArticleBlocks(article: CuboxArticle): LogseqBlock[] {
    const blocks: LogseqBlock[] = [];

    // Article content
    if (article.content) {
        blocks.push({
            content: "## Content",
            children: [{ content: article.content }]
        });
    }

    // Highlights
    if (article.highlights && article.highlights.length > 0) {
        const highlightBlocks: LogseqBlock[] = article.highlights.map(highlight =>
            generateHighlightBlock(highlight)
        );

        blocks.push({
            content: "## Highlights",
            children: highlightBlocks
        });
    }

    return blocks;
}

/**
 * Generate a block for a highlight
 */
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

/**
 * Link article page to parent page
 */
async function linkToParentPage(articlePageName: string, parentPageName: string): Promise<void> {
    const parentPage = await logseq.Editor.getPage(parentPageName);
    if (parentPage) {
        const blocks = await logseq.Editor.getPageBlocksTree(parentPage.name);

        // Find or create a "Recent Articles" section
        let recentArticlesBlock = blocks.find(block =>
            block.content.includes("## Recent Articles") ||
            block.content.includes("Recent Articles")
        );

        if (!recentArticlesBlock) {
            // Create the Recent Articles section
            // If page has existing content, insert at the top; otherwise append
            const hasExistingContent = blocks.length > 0;
            const newBlock = await logseq.Editor.insertBlock(
                parentPage.name,
                "## Recent Articles",
                { before: hasExistingContent, isPageBlock: true }
            );
            recentArticlesBlock = newBlock || undefined;
        }

        if (recentArticlesBlock) {
            // Add link to the article at the top of Recent Articles section (reverse chronological order)
            await logseq.Editor.insertBlock(
                recentArticlesBlock.uuid,
                `[[${articlePageName}]]`,
                { before: false }
            );
        }
    }
}

/**
 * Format date string
 */
function formatDate(dateString: string, format: string = "yyyy-MM-dd HH:mm"): string {
    if (!dateString) return "";

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    // Simple date formatting
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    if (format === "yyyy-MM-dd") {
        return `${year}-${month}-${day}`;
    }

    return `${year}-${month}-${day} ${hours}:${minutes}`;
}