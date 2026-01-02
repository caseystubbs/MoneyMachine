import Stripe from 'stripe';

// Initialize Stripe with the correct 2026 version
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-12-15.clover', 
});

export const revalidate = 60; // Refresh data every 60 seconds

async function getStripeData() {
  try {
    // 1. Get Balance
    const balance = await stripe.balance.retrieve();
    const available = balance.available[0]?.amount / 100;
    const pending = balance.pending[0]?.amount / 100;

    // 2. Get Last 5 Sales
    const charges = await stripe.charges.list({ limit: 5 });

    return { available, pending, charges: charges.data };
  } catch (error) {
    console.error('Stripe Error:', error);
    return null;
  }
}

export default async function Dashboard() {
  const data = await getStripeData();

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500">Connection Error</h1>
          <p className="text-slate-400">Could not pull Stripe data. Check your API Key.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-600 bg-clip-text text-transparent">
            Money Machine
          </h1>
          <div className="px-3 py-1 bg-green-900/30 border border-green-800 rounded-full text-xs text-green-400">
            ● System Live
          </div>
        </div>

        {/* Big Numbers Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Available Cash */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
            <h2 className="text-slate-400 text-sm font-medium mb-2">Available to Payout</h2>
            <div className="text-4xl font-bold text-white">
              ${data.available.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* Card 2: Pending (On the way) */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
            <h2 className="text-slate-400 text-sm font-medium mb-2">Pending (On the way)</h2>
            <div className="text-4xl font-bold text-slate-300">
              ${data.pending.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Recent Transactions List */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-800">
            <h3 className="text-lg font-semibold text-white">Recent Sales</h3>
          </div>
          <div>
            {data.charges.map((charge) => (
              <div key={charge.id} className="p-4 border-b border-slate-800 hover:bg-slate-800/50 flex justify-between items-center">
                <div>
                  <div className="font-medium text-white">
                    {charge.description || 'Stripe Payment'}
                  </div>
                  <div className="text-xs text-slate-500">
                    {new Date(charge.created * 1000).toLocaleDateString()}
                  </div>
                </div>
                <div className="font-bold text-green-400">
                  +${(charge.amount / 100).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}