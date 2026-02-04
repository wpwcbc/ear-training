export const loadJson = (key, fallback) => {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) {
            return fallback;
        }
        return JSON.parse(raw);
    }
    catch {
        return fallback;
    }
};
export const saveJson = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
};
export const loadList = (key) => {
    const parsed = loadJson(key, []);
    return Array.isArray(parsed) ? parsed : [];
};
export const saveList = (key, value) => {
    saveJson(key, value);
};
export const prependWithLimit = (key, item, limit = 200) => {
    const list = loadList(key);
    list.unshift(item);
    if (list.length > limit) {
        list.length = limit;
    }
    saveList(key, list);
};
export const prependManyWithLimit = (key, items, limit = 200) => {
    if (!items.length) {
        return;
    }
    const list = loadList(key);
    const merged = [...items, ...list];
    if (merged.length > limit) {
        merged.length = limit;
    }
    saveList(key, merged);
};
