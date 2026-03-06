export type MonthlySummary = {
  month: string;
  monthKey: string;
  grossRevenue: number;
  fees: number; // negative for display consistency
  netRevenue: number;
  expenses: number;
  netProfit: number;
  profitMargin: number;
  revenueSources: {
    paypal: number;
    youtube: number;
    stripe: number;
    paymentsAi: number;
    substack: number;
  };
  expenseBreakdown: {
    software: number;
    contractors: number;
    rent: number;
    fees: number;
    other: number;
  };
};

export const monthlySummary: MonthlySummary[] = [
  {
    month: "March",
    monthKey: "2025-03",
    grossRevenue: 4225.47,
    fees: -175.52,
    netRevenue: 4049.95,
    expenses: 809.28,
    netProfit: 3240.67,
    profitMargin: 0.7669371691,
    revenueSources: {
      paypal: 2425.47,
      youtube: 0,
      stripe: 1800,
      paymentsAi: 0,
      substack: 0,
    },
    expenseBreakdown: {
      software: 407.02,
      contractors: 0,
      rent: 0,
      fees: 175.52,
      other: 226.74,
    },
  },
  {
    month: "April",
    monthKey: "2025-04",
    grossRevenue: 4460.63,
    fees: -225.42,
    netRevenue: 4311.77,
    expenses: 580.77,
    netProfit: 3731.0,
    profitMargin: 0.8364289349,
    revenueSources: {
      paypal: 2400,
      youtube: 0,
      stripe: 2060.63,
      paymentsAi: 0,
      substack: 0,
    },
    expenseBreakdown: {
      software: 346.89,
      contractors: 105.5,
      rent: 0,
      fees: 225.42,
      other: -97.04,
    },
  },
  {
    month: "May",
    monthKey: "2025-05",
    grossRevenue: 3061.4,
    fees: -160.23,
    netRevenue: 2976.5,
    expenses: 1822.74,
    netProfit: 1153.76,
    profitMargin: 0.3768733259,
    revenueSources: {
      paypal: 1608.77,
      youtube: 0,
      stripe: 1452.63,
      paymentsAi: 0,
      substack: 0,
    },
    expenseBreakdown: {
      software: 717.96,
      contractors: 233.88,
      rent: 0,
      fees: 160.23,
      other: 710.67,
    },
  },
  {
    month: "June",
    monthKey: "2025-06",
    grossRevenue: 1756.58,
    fees: -144.08,
    netRevenue: 1714.82,
    expenses: 1536.75,
    netProfit: 178.07,
    profitMargin: 0.1013731228,
    revenueSources: {
      paypal: 600,
      youtube: 0,
      stripe: 1156.58,
      paymentsAi: 0,
      substack: 0,
    },
    expenseBreakdown: {
      software: 793.96,
      contractors: 938.38,
      rent: 0,
      fees: 144.08,
      other: -339.67,
    },
  },
  {
    month: "July",
    monthKey: "2025-07",
    grossRevenue: 8627.59,
    fees: -456.63,
    netRevenue: 8421.86,
    expenses: 1608.77,
    netProfit: 6813.09,
    profitMargin: 0.7896863435,
    revenueSources: {
      paypal: 4500,
      youtube: 0,
      stripe: 4127.59,
      paymentsAi: 0,
      substack: 0,
    },
    expenseBreakdown: {
      software: 1000.7,
      contractors: 938.38,
      rent: 0,
      fees: 456.63,
      other: -786.94,
    },
  },
  {
    month: "August",
    monthKey: "2025-08",
    grossRevenue: 10243.32,
    fees: -515.38,
    netRevenue: 9943.17,
    expenses: 4614.52,
    netProfit: 4071.12,
    profitMargin: 0.3974414545,
    revenueSources: {
      paypal: 6830,
      youtube: 0,
      stripe: 2800,
      paymentsAi: 0,
      substack: 613.32,
    },
    expenseBreakdown: {
      software: 1095.16,
      contractors: 1220.31,
      rent: 1950,
      fees: 515.38,
      other: -166.33,
    },
  },
  {
    month: "September",
    monthKey: "2025-09",
    grossRevenue: 4492.1,
    fees: -515.38,
    netRevenue: 4191.95,
    expenses: 2556.92,
    netProfit: 610.33,
    profitMargin: 0.1358674117,
    revenueSources: {
      paypal: 1500,
      youtube: 0,
      stripe: 2646.05,
      paymentsAi: 0,
      substack: 346.05,
    },
    expenseBreakdown: {
      software: 1422.91,
      contractors: 1220.31,
      rent: 0,
      fees: 515.38,
      other: -601.68,
    },
  },
  {
    month: "October",
    monthKey: "2025-10",
    grossRevenue: 8128.65,
    fees: -253.19,
    netRevenue: 8032.41,
    expenses: 2742.83,
    netProfit: 5261.43,
    profitMargin: 0.6472698419,
    revenueSources: {
      paypal: 2180.22,
      youtube: 0,
      stripe: 3888,
      paymentsAi: 1794,
      substack: 266.43,
    },
    expenseBreakdown: {
      software: 1306.81,
      contractors: 1220.31,
      rent: 650,
      fees: 253.19,
      other: -687.48,
    },
  },
  {
    month: "November",
    monthKey: "2025-11",
    grossRevenue: 22865.31,
    fees: -759.19,
    netRevenue: 22581.14,
    expenses: 3951.61,
    netProfit: 17988.55,
    profitMargin: 0.7867179583,
    revenueSources: {
      paypal: 9708.98,
      youtube: 0,
      stripe: 9455,
      paymentsAi: 2580.59,
      substack: 1120.74,
    },
    expenseBreakdown: {
      software: 2228.21,
      contractors: 1202,
      rent: 650,
      fees: 759.19,
      other: -887.79,
    },
  },
  {
    month: "December",
    monthKey: "2025-12",
    grossRevenue: 21122.62,
    fees: -769.41,
    netRevenue: 20852.26,
    expenses: 4909.24,
    netProfit: 15847.65,
    profitMargin: 0.7502691427,
    revenueSources: {
      paypal: 6519.62,
      youtube: 776,
      stripe: 10770,
      paymentsAi: 2446,
      substack: 611,
    },
    expenseBreakdown: {
      software: 3651.53,
      contractors: 1711.66,
      rent: 650,
      fees: 769.41,
      other: -1873.36,
    },
  },
  {
    month: "January",
    monthKey: "2026-01",
    grossRevenue: 12433.24,
    fees: -513.29,
    netRevenue: 12129.19,
    expenses: 4532.94,
    netProfit: 7196.25,
    profitMargin: 0.5787912081,
    revenueSources: {
      paypal: 6187.42,
      youtube: 776,
      stripe: 5288,
      paymentsAi: 0,
      substack: 181.82,
    },
    expenseBreakdown: {
      software: 2546.8,
      contractors: 1849.88,
      rent: 650,
      fees: 513.29,
      other: -1026.03,
    },
  },
  {
    month: "February",
    monthKey: "2026-02",
    grossRevenue: 6541.41,
    fees: -269.07,
    netRevenue: 6403.07,
    expenses: 3301.03,
    netProfit: 3002.04,
    profitMargin: 0.4589285796,
    revenueSources: {
      paypal: 2926.22,
      youtube: 478.61,
      stripe: 2797.29,
      paymentsAi: 0,
      substack: 339.29,
    },
    expenseBreakdown: {
      software: 1426.29,
      contractors: 934.41,
      rent: 650,
      fees: 269.07,
      other: 21.26,
    },
  },
];