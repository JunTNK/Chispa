import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

let stripeClient: Stripe | null = null;
function getStripe() {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }
    stripeClient = new Stripe(key, {
      apiVersion: '2026-07-29.dahlia',
    });
  }
  return stripeClient;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { priceId, customerId, successUrl, cancelUrl } = body;

    if (!priceId) {
      return NextResponse.json({ error: 'priceId is required' }, { status: 400 });
    }

    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer: customerId || undefined,
      success_url: successUrl || process.env.STRIPE_SUCCESS_URL || 'https://chispa.app/upgrade/success',
      cancel_url: cancelUrl || process.env.STRIPE_CANCEL_URL || 'https://chispa.app/upgrade/cancel',
      metadata: {
        app_source: 'chispa-web-checkout',
        source: 'web', // explicitly web, not iOS/Android app store
      },
      subscription_data: {
        trial_period_days: 7, // 7-day trial for new subscribers
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('[CHISPA] Stripe checkout error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
