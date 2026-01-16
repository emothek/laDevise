
import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

interface RateProps {
    currency: string;
    buy: number;
    sell: number;
}

const RateRow = ({ currency, buy, sell }: RateProps) => (
    <FlexWidget
        style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
            width: 'match_parent',
        }}
    >
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TextWidget
                text={currency}
                style={{
                    fontSize: 16,
                    fontWeight: 'bold',
                    color: '#ffffff',
                    marginRight: 8,
                }}
            />
        </FlexWidget>
        <FlexWidget style={{ flexDirection: 'row' }}>
            <FlexWidget style={{ alignItems: 'flex-end', marginRight: 12 }}>
                <TextWidget
                    text="Buy"
                    style={{ fontSize: 10, color: '#aaaaaa' }}
                />
                <TextWidget
                    text={buy.toFixed(0)}
                    style={{ fontSize: 14, fontWeight: 'bold', color: '#4CAF50' }}
                />
            </FlexWidget>
            <FlexWidget style={{ alignItems: 'flex-end' }}>
                <TextWidget
                    text="Sell"
                    style={{ fontSize: 10, color: '#aaaaaa' }}
                />
                <TextWidget
                    text={sell.toFixed(0)}
                    style={{ fontSize: 14, fontWeight: 'bold', color: '#F44336' }}
                />
            </FlexWidget>
        </FlexWidget>
    </FlexWidget>
);

export function RateWidget({ rates }: { rates: RateProps[] }) {
    const eur = rates.find(r => r.currency === 'EUR');
    const usd = rates.find(r => r.currency === 'USD');

    return (
        <FlexWidget
            style={{
                height: 'match_parent',
                width: 'match_parent',
                backgroundColor: '#1c1c1e',
                borderRadius: 16,
                padding: 12,
                flexDirection: 'column',
                justifyContent: 'center',
            }}
        >
            <FlexWidget
                style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginBottom: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: '#333',
                    paddingBottom: 8,
                }}
            >
                <TextWidget
                    text="La Devise"
                    style={{ fontSize: 14, color: '#aaaaaa', fontWeight: 'bold' }}
                />
                <TextWidget
                    text="Square Market"
                    style={{ fontSize: 10, color: '#aaaaaa', fontStyle: 'italic' }}
                />
            </FlexWidget>

            {eur && <RateRow currency="EUR" buy={eur.buy} sell={eur.sell} />}
            {usd && <RateRow currency="USD" buy={usd.buy} sell={usd.sell} />}

            {!eur && !usd && (
                <TextWidget text="Loading rates..." style={{ color: '#fff' }} />
            )}
        </FlexWidget>
    );
}
