export const getCoverImage = (attachments) => {
    if (!attachments) return null;
    try {
        const arr = typeof attachments === 'string' ? JSON.parse(attachments) : attachments;
        if (!Array.isArray(arr)) return null;
        
        // Find the first attachment that is an image
        const img = arr.find(a => a.type && (a.type.startsWith('image/') || a.url.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i)));
        return img ? img.url : null;
    } catch(e) {
        return null;
    }
};
