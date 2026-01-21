export const extractKeywords = (messages: string[], count: number = 5): string[] => {
    if (!messages || messages.length === 0) return [];

    const stopWords = new Set([
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up', 'about', 'into', 'over', 'after', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'can', 'could', 'may', 'might', 'must', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'this', 'that', 'these', 'those', 'there', 'here', 'what', 'which', 'who', 'whom', 'whose', 'where', 'when', 'why', 'how',
        // Japanese particles (simplified)
        'の', 'に', 'は', 'を', 'が', 'と', 'て', 'で', 'し', 'た', 'ます', 'です', 'こと', 'ある', 'いる', 'ない', 'など', 'から', 'まで', 'ため', 'より', 'よう'
    ]);

    const wordMap = new Map<string, number>();

    messages.forEach(text => {
        if (!text) return;
        // Simple tokenizer: split by non-word characters (supports English and basic space-separated)
        // For proper Japanese support, we'd need a tokenizer like Kuromoji, but we rely on simple splitting or char blocks here.
        // Try to split by spaces and punctuation.
        const words = text.toLowerCase().split(/[^\w\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF]+/);

        words.forEach(word => {
            if (word.length < 2) return; // Skip single characters
            if (stopWords.has(word)) return;
            if (/^\d+$/.test(word)) return; // Skip numbers

            wordMap.set(word, (wordMap.get(word) || 0) + 1);
        });
    });

    // Sort by frequency
    return Array.from(wordMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, count)
        .map(entry => entry[0]);
};
