import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase/supabase';

// Convert USD to satoshis using real-time BTC price
async function usdToSats(usdAmount: number) {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
    const data = await response.json();
    const btcPrice = data.bitcoin.usd;
    const btcAmount = usdAmount / btcPrice;
    return Math.round(btcAmount * 100000000); // Convert to satoshis
  } catch (error) {
    console.error('Error fetching BTC price:', error);
    throw new Error('Failed to convert USD to satoshis');
  }
}

export async function POST(req: Request) {
  try {
    const { amount, customerInfo, type = "lightning" } = await req.json();
    
    // Convert USD amount to satoshis
    const satsAmount = await usdToSats(amount);
    
    const response = await fetch("https://coinos.io/api/invoice", {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'Authorization': `Bearer ${process.env.COINOS_API_KEY}`
      },
      body: JSON.stringify({
        invoice: {
          amount: satsAmount,
          type
        }
      })
    });

    const data = await response.json();

    // Create payment record in appropriate database table based on type
    const tableName = type === 'bitcoin' ? 'bitcoin_payments' : 'lightning_payments';
    
    const { data: payment, error } = await supabase
      .from(tableName)
      .insert([
        {
          order_id: crypto.randomUUID(),
          hash: data.hash,
          amount: amount, // Store original USD amount
          status: 'pending',
          customer_email: customerInfo.email,
          customer_first_name: customerInfo.firstName,
          customer_last_name: customerInfo.lastName,
          customer_address: customerInfo.address,
          customer_city: customerInfo.city,
          customer_state: customerInfo.state,
          customer_zip: customerInfo.zipCode,
          customer_country: customerInfo.country,
          customer_phone: customerInfo.phone || null
        }
      ])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ payment, hash: data.hash });
  } catch (error) {
    console.error('Payment error:', error);
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 });
  }
}