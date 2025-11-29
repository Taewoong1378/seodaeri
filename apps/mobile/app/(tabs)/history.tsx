import { FlatList, StyleSheet, Text, View } from 'react-native'

const mockTransactions: Array<{
  id: string
  ticker: string
  type: 'BUY' | 'SELL' | 'DIVIDEND'
  price: number
  quantity: number
  date: string
}> = []

export default function History() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>거래내역</Text>
      </View>
      {mockTransactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>아직 거래 내역이 없습니다.</Text>
          <Text style={styles.emptySubtext}>
            매매 인증샷을 업로드하여{'\n'}첫 거래를 기록해보세요.
          </Text>
        </View>
      ) : (
        <FlatList
          data={mockTransactions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.transactionItem}>
              <View>
                <Text style={styles.ticker}>{item.ticker}</Text>
                <Text style={styles.date}>{item.date}</Text>
              </View>
              <View style={styles.rightContent}>
                <Text
                  style={[
                    styles.type,
                    item.type === 'BUY'
                      ? styles.buy
                      : item.type === 'SELL'
                        ? styles.sell
                        : styles.dividend,
                  ]}
                >
                  {item.type === 'BUY' ? '매수' : item.type === 'SELL' ? '매도' : '배당'}
                </Text>
                <Text style={styles.amount}>
                  ₩{(item.price * item.quantity).toLocaleString()}
                </Text>
              </View>
            </View>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  transactionItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticker: {
    fontSize: 16,
    fontWeight: '600',
  },
  date: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  rightContent: {
    alignItems: 'flex-end',
  },
  type: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  buy: {
    color: '#ef4444',
  },
  sell: {
    color: '#3b82f6',
  },
  dividend: {
    color: '#22c55e',
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
  },
})
