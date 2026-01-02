import Stripe from 'stripe';

// 1. Setup Stripe
const stripe = new Stripe((process.env.STRIPE_SECRET_KEY || '').trim(), {
  apiVersion: '2025-12-15.clover',
});

// FORCE REFRESH: Never cache this page
export const revalidate = 0;

// --- Helper: Get PayPal Access Token ---
async function getPayPalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  
  console.log("DEBUG: Attempting to get PayPal Token..."); // LOG

  if (!clientId || !clientSecret) {
    console.error("DEBUG: Missing PayPal Keys in Environment!");
    return null;
  }

  const auth = Buffer.from(clientId + ":" + clientSecret).toString("base64");

  try {
    const response = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
      method: "POST",
      body: "grant_type=client_credentials",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    
    if (!response.ok) {
      console.error(`DEBUG: Token Failed! Status: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.error("DEBUG: Token Response:", text);
      return null;
    }

    const data = await response.json();
    console.log("DEBUG: Got PayPal Token successfully."); // LOG
    return data.access_token;
  } catch (e) {
    console.error("DEBUG: PayPal Token Network Error", e);
    return null;
  }
}

// --- Helper: Get PayPal Transactions ---
async function getPayPalData(accessToken: string) {
  // Get date range for the last 30 days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 30); // Look back 30 days

  const startStr = startDate.toISOString().split('.')[0] + 'Z';
  const endStr = endDate.toISOString().split('.')[0] + 'Z';

  console.log(`DEBUG: Fetching transactions from ${startStr} to ${endStr}`);

  try {
    const response = await fetch(
      `https://api-m.paypal.com/v1/reporting/transactions?start_date=${startStr}&end_date=${endStr}&fields=transaction_info,payer_info,cart_info`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
        console.error(`DEBUG: Transaction Fetch Failed! Code: ${response.status}`);
        const errorText = await response.text();
        console.error("DEBUG: PayPal Error Message:", errorText);
        return { income: 0, expense: 0, incomeList: [], expenseList: [] };
    }

    const data = await response.json();
    const count = data.transaction_details ? data.transaction_details.length : 0;
    console.log(`DEBUG: PayPal returned ${count} transactions.`); // LOG

    let income = 0;
    let expense = 0;
    const incomeList: any[] = [];
    const expenseList: any[] = [];

    if (data.transaction_details) {
      data.transaction_details.forEach((t: any) => {
        const amount = parseFloat(t.transaction_info.transaction_amount.value);
        
        // LOG the first few transactions to see if they are real
        if (incomeList.length + expenseList.length < 3) {
            console.log(`DEBUG: Found Transaction: ${amount} | ${t.transaction_info.transaction_subject}`);
        }

        const item = {
          id: t.transaction_info.transaction_id,
          desc: t.transaction_info.transaction_subject || t.payer_info?.payer_name?.alternate_full_name || "PayPal Transaction",
          date: t.transaction_info.transaction_updated_date,
          amount: amount
        };

        if (amount >= 0) {
          income += amount;
          incomeList.push(item);
        } else {
          expense += Math.abs(amount); 
          expenseList.push(item);
        }
      });
    }

    return { 
      income, 
      expense, 
      incomeList: incomeList.slice(0, 5), 
      expenseList: expenseList.slice(0, 5) 
    };
  } catch (e) {
    console.error("DEBUG: PayPal Fetch Error", e);
    return { income: 0, expense: 0, incomeList: [], expenseList: [] };
  }
}

// --- Main Dashboard Data Fetcher ---
async function getDashboardData() {
  // 1. Fetch Stripe (Income)
  let stripeData = { available: 0, pending: 0, charges: [] };
  try {
    const balance = await stripe.balance.retrieve();
    const available = balance.available[0]?.amount / 100;
    const pending = balance.pending[0]?.amount / 100;
    const charges = await stripe.charges.list({ limit: 5 });
    stripeData = { available, pending, charges: charges.data as any };
  } catch (e) {
    console.error("Stripe Error", e);
  }

  // 2. Fetch PayPal
  const ppToken = await getPayPalAccessToken();
  const paypalData = ppToken ? await getPayPalData(ppToken) : { income: 0, expense: 0, incomeList: [], expenseList: [] };

  return { stripe: stripeData, paypal: paypalData };
}

export default async function Dashboard() {
  const data = await getDashboardData();
  
  const totalAvailableCash = data.stripe.available; 
  const totalPayPalIncome = data.paypal.income; 
  const totalBurn = data.paypal.expense; 
  const netFlow30d = (data.stripe.pending + totalPayPalIncome) - totalBurn;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-600 bg-clip-text text-transparent">
              Money Machine
            </h1>
            <p className="text-slate-400 text-sm mt-1">Stripe + PayPal Combined</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500 uppercase tracking-wider">30-Day Net Flow</p>
            <p className={`text-3xl font-bold ${netFlow30d >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {netFlow30d >= 0 ? '+' : ''}${netFlow30d.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* The 3 Big Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
            <h2 className="text-slate-400 text-sm font-medium mb-2">Stripe Balance (Ready)</h2>
            <div className="text-4xl font-bold text-white">${data.stripe.available.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-green-500 mt-2">+${data.stripe.pending.toLocaleString()} incoming</p>
          </div>
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
            <h2 className="text-slate-400 text-sm font-medium mb-2">PayPal Revenue (30d)</h2>
            <div className="text-4xl font-bold text-green-400">+${totalPayPalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-slate-500 mt-2">Digital Sales & Invoices</p>
          </div>
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
            <h2 className="text-slate-400 text-sm font-medium mb-2">Total Expenses (30d)</h2>
            <div className="text-4xl font-bold text-red-400">-${totalBurn.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-slate-500 mt-2">Operational Spend</p>
          </div>
        </div>
        
        {/* Transaction Split View */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Income */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 bg-slate-900/50"><h3 className="font-semibold text-green-400">Recent Income</h3></div>
            <div>
              {[...data.stripe.charges, ...data.paypal.incomeList].sort((a: any, b: any) => (b.date || b.created) - (a.date || a.created)).slice(0, 6).map((item: any, i) => (
                <div key={i} className="p-4 border-b border-slate-800 flex justify-between items-center">
                  <div className="text-sm">
                    <div className="text-white font-medium truncate w-48">{item.description || item.desc || 'Sale'}</div>
                    <div className="text-slate-500 text-xs flex items-center gap-2">{item.desc ? <span className="text-blue-400">PayPal</span> : <span className="text-purple-400">Stripe</span>}</div>
                  </div>
                  <div className="font-bold text-green-400">+${(Math.abs(item.amount / (item.created ? 100 : 1))).toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Recent Expenses */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 bg-slate-900/50"><h3 className="font-semibold text-red-400">Recent Expenses</h3></div>
            <div>
              {data.paypal.expenseList.length === 0 ? <div className="p-8 text-center text-slate-500">No recent expenses found.</div> : data.paypal.expenseList.map((t: any) => (
                  <div key={t.id} className="p-4 border-b border-slate-800 flex justify-between items-center">
                    <div className="text-sm"><div className="text-white font-medium truncate w-48">{t.desc}</div><div className="text-slate-500 text-xs text-blue-400">PayPal</div></div>
                    <div className="font-bold text-red-400">-${Math.abs(t.amount).toFixed(2)}</div>
                  </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}