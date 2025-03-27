export function getRequireImage(path: string): string {
	if (!path) {
		return '';
	}
	if (path.startsWith('http')) {
		return path;
	}
	// return require(`../assets/${path}`);
  return new URL(`../assets/${path}`, import.meta.url).href;
}
