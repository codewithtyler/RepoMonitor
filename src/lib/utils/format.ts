export function formatNumber(num: number): string {
    if (num >= 1_000_000) {
        return (num / 1_000_000).toFixed(1) + 'M';
    }
    if (num >= 10_000) {
        return (num / 1_000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
}