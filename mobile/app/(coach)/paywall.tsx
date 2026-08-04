import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAppTheme } from '@/theme/ThemeProvider';
import { Purchases } from '@/lib/revenuecat';
import type { PurchasesPackage } from 'react-native-purchases';
import { useAuthStore } from '@/store/authStore';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Pill } from '@/components/Pill';

interface Tier {
  productId: string;
  name: string;
  price: string;
  limit: string;
  popular?: boolean;
}

const TIERS: Tier[] = [
  { productId: 'tru_starter_monthly', name: 'Starter', price: '$9/mo', limit: 'Up to 10 athletes' },
  { productId: 'tru_growth_monthly', name: 'Growth', price: '$19/mo', limit: 'Up to 25 athletes', popular: true },
  { productId: 'tru_pro_monthly', name: 'Pro', price: '$39/mo', limit: 'Unlimited athletes' },
];

export default function PaywallScreen() {
  const { colors } = useAppTheme();
  const [packages, setPackages] = useState<Record<string, PurchasesPackage>>({});
  const [offeringsError, setOfferingsError] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Purchases.getOfferings()
      .then((offerings) => {
        const map: Record<string, PurchasesPackage> = {};
        for (const pkg of offerings.current?.availablePackages ?? []) {
          map[pkg.product.identifier] = pkg;
        }
        setPackages(map);
        if (Object.keys(map).length === 0) {
          setOfferingsError('No products configured yet — check back soon, or contact support.');
        }
      })
      .catch(() => {
        setOfferingsError('Preview mode — real purchases require the full app (not available while testing in Expo Go).');
      });
  }, []);

  async function handleSubscribe(tier: Tier) {
    const pkg = packages[tier.productId];
    if (!pkg) return;
    setPurchasing(tier.productId);
    setError(null);
    try {
      await Purchases.purchasePackage(pkg);
      router.back();
    } catch (err: unknown) {
      const rcError = err as { userCancelled?: boolean; message?: string };
      if (!rcError.userCancelled) {
        setError(rcError.message ?? 'Purchase failed. Please try again.');
      }
    } finally {
      setPurchasing(null);
    }
  }

  async function handleRestore() {
    setRestoring(true);
    setError(null);
    try {
      await Purchases.restorePurchases();
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not restore purchases.');
    } finally {
      setRestoring(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Upgrade" onBack={router.canGoBack() ? () => router.back() : undefined} />
      <Screen>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 4 }}>
          Your 30-day free trial has ended
        </Text>
        <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 20 }}>
          Pick a plan to keep coaching your squad. Cancel anytime.
        </Text>

        {offeringsError && (
          <Text style={{ fontSize: 11, color: colors.warning, marginBottom: 12 }}>{offeringsError}</Text>
        )}

        {TIERS.map((tier) => (
          <Card key={tier.productId} style={{ borderWidth: tier.popular ? 2 : 1, borderColor: tier.popular ? colors.accent : colors.border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{tier.name}</Text>
              {tier.popular && <Pill label="Most popular" tone="success" />}
            </View>
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>{tier.price}</Text>
            <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 12 }}>{tier.limit}</Text>
            <Button
              label={`Subscribe to ${tier.name}`}
              onPress={() => handleSubscribe(tier)}
              loading={purchasing === tier.productId}
              disabled={!packages[tier.productId] || purchasing != null}
            />
          </Card>
        ))}

        {error && <Text style={{ color: colors.danger, fontSize: 12, marginBottom: 8, textAlign: 'center' }}>{error}</Text>}

        <Button label="Restore purchases" variant="outline" onPress={handleRestore} loading={restoring} />

        <Pressable
          onPress={async () => {
            await useAuthStore.getState().logout();
            router.replace('/login');
          }}
          style={{ marginTop: 16, alignItems: 'center' }}
        >
          <Text style={{ fontSize: 12, color: colors.textFaint }}>Log out</Text>
        </Pressable>
      </Screen>
    </View>
  );
}
