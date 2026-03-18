// Mock prescreen quota data — shared across the app
export const QUOTA = {
  org: {
    name: 'Greenlyne Demo Org',
    monthlyTotal: 500,
    monthlyUsed: 312,
    get monthlyRemaining() { return this.monthlyTotal - this.monthlyUsed },
    ytdUsed: 2847,
    ytdTotal: 6000,
    period: 'March 2026',
  },
  user: {
    name: 'Demo User',
    monthlyTotal: 100,
    monthlyUsed: 47,
    get monthlyRemaining() { return this.monthlyTotal - this.monthlyUsed },
  },
  costPerPrescreen: 1, // 1 credit per prescreen
}
