// backend/src/utils/like.js
export const likeContiene = (s) => `%${String(s).replace(/[\\%_]/g, "\\$&")}%`;
