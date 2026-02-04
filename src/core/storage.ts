export const loadJson = <T>(key: string, fallback: T): T => {
	try {
		const raw = localStorage.getItem(key);
		if (!raw) {
			return fallback;
		}
		return JSON.parse(raw) as T;
	} catch {
		return fallback;
	}
};

export const saveJson = (key: string, value: unknown): void => {
	localStorage.setItem(key, JSON.stringify(value));
};

export const loadList = <T>(key: string): T[] => {
	const parsed = loadJson<unknown>(key, []);
	return Array.isArray(parsed) ? (parsed as T[]) : [];
};

export const saveList = <T>(key: string, value: T[]): void => {
	saveJson(key, value);
};

export const prependWithLimit = <T>(
	key: string,
	item: T,
	limit = 200,
): void => {
	const list = loadList<T>(key);
	list.unshift(item);
	if (list.length > limit) {
		list.length = limit;
	}
	saveList(key, list);
};

export const prependManyWithLimit = <T>(
	key: string,
	items: T[],
	limit = 200,
): void => {
	if (!items.length) {
		return;
	}
	const list = loadList<T>(key);
	const merged = [...items, ...list];
	if (merged.length > limit) {
		merged.length = limit;
	}
	saveList(key, merged);
};
