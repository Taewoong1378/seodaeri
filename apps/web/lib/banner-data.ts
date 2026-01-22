import { Building2, TrendingUp, Wallet, BarChart3, DollarSign, Cpu, Gift } from 'lucide-react';
import type { ReactElement } from 'react';
import { createElement } from 'react';

// Banner Provider 타입 (none 추가 - 모든 배너 숨김)
export type BannerProvider = 'none' | 'all' | 'tiger' | 'sol' | 'kodex' | 'rise' | 'kiwoom';

// 배너 데이터 타입
export interface BannerItem {
  id: number;
  title: string;
  description: string;
  subtext: string;
  bgGradient: string;
  image: string;
  iconName: 'TrendingUp' | 'Wallet' | 'Building2' | 'BarChart3' | 'DollarSign' | 'Cpu' | 'Gift';
  action: string;
  link?: string;
}

export interface SmallBannerItem {
  id: number;
  title: string;
  description: string;
  image: string;
  link: string;
  gradient: string;
}

// 혜택 배너 (포트폴리오용)
export interface BenefitBannerItem {
  title: string;
  highlight: string;
  subtitle: string;
  image: string;
  link: string;
  buttonText: string;
  // 운용사별 스타일링
  bgGradient: string;        // 배경 그라디언트
  highlightColor: string;    // 하이라이트 텍스트 색상
  buttonBg: string;          // 버튼 배경색
  buttonHoverBg: string;     // 버튼 호버 배경색
}

// 거래내역 배너 (배당/입출금 탭용)
export interface TransactionBannerItem {
  id: number;
  title: string;
  description: string;
  image: string;
  link: string;
  gradient: string;
  tabType: 'dividend' | 'deposit' | 'balance';
}

// 아이콘 매핑
const iconMap = {
  TrendingUp,
  Wallet,
  Building2,
  BarChart3,
  DollarSign,
  Cpu,
  Gift,
};

export function getIconElement(iconName: BannerItem['iconName']): ReactElement {
  const IconComponent = iconMap[iconName];
  return createElement(IconComponent, { className: 'w-12 h-12 text-white/90' });
}

// =============================================================================
// 기존 배너 (모든 운용사 혼합)
// =============================================================================

const ALL_CAROUSEL_BANNERS: BannerItem[] = [
  {
    id: 1,
    title: 'KODEX 미국배당프리미엄',
    description: '매월 받는 월배당 ETF의 정석',
    subtext: 'S&P500 상승분과 배당수익을 동시에',
    bgGradient: 'from-blue-700 to-slate-900',
    image: '/images/banners/kodex/banner-kodex-dividend.png',
    iconName: 'TrendingUp',
    action: '상품 확인하기',
  },
  {
    id: 2,
    title: '키움증권 X 서대리',
    description: '서대리 구독자 전용 특별 혜택',
    subtext: '해외주식 환전 우대 95% + $40 즉시 지급',
    bgGradient: 'from-pink-600 to-rose-900',
    image: '/images/banners/kiwoom/banner-kiwoom-event.png',
    iconName: 'Gift',
    action: '이벤트 확인',
  },
  {
    id: 3,
    title: '토스증권 주식 모으기',
    description: '매일 커피 한 잔 값으로 시작하는 투자',
    subtext: '서대리 추천 포트폴리오 원클릭 매수',
    bgGradient: 'from-emerald-600 to-teal-900',
    image: '/images/banners/all/banner-toss-collection.png',
    iconName: 'Wallet',
    action: '시작하기',
  },
  {
    id: 4,
    title: '미래에셋증권 연금저축',
    description: '노후 준비는 서대리와 함께',
    subtext: '개인연금/IRP 이전 시 신세계 상품권 증정',
    bgGradient: 'from-orange-500 to-amber-800',
    image: '/images/banners/all/banner-mirae-pension.png',
    iconName: 'Building2',
    action: '자세히 보기',
  },
];

const ALL_SMALL_BANNERS: SmallBannerItem[] = [
  {
    id: 1,
    title: 'SOL 미국배당다우존스',
    description: '한국판 SCHD의 대명사',
    image: '/images/banners/sol/banner-sol-dividend.png',
    link: '#',
    gradient: 'from-blue-600 to-cyan-600',
  },
  {
    id: 2,
    title: 'TIGER 미국테크TOP10',
    description: '미국 빅테크 상위 10개 종목 집중 투자',
    image: '/images/banners/tiger/banner-tiger-tech10.png',
    link: '#',
    gradient: 'from-orange-500 to-amber-500',
  },
];

const ALL_TRANSACTION_BANNERS: TransactionBannerItem[] = [
  {
    id: 1,
    title: 'SOL 미국배당다우존스',
    description: '한국판 SCHD로 시작하는 월배당 투자',
    image: '/images/banners/sol/banner-sol-dividend.png',
    link: 'https://www.shinhanamc.com/product/etf/domestic/overview.do',
    gradient: 'from-blue-600 to-indigo-900',
    tabType: 'dividend',
  },
  {
    id: 2,
    title: '키움증권 계좌 개설',
    description: '해외주식 환전 우대 95% + $40 지원금',
    image: '/images/banners/kiwoom/banner-kiwoom-event.png',
    link: 'https://www.kiwoom.com',
    gradient: 'from-pink-600 to-rose-900',
    tabType: 'deposit',
  },
  {
    id: 3,
    title: 'TIGER 미국S&P500',
    description: '매월 꾸준히 적립식 투자',
    image: '/images/banners/tiger/banner-tiger-sp500.png',
    link: 'https://investments.miraeasset.com/tigeretf/ko/main/index.do',
    gradient: 'from-orange-600 to-blue-900',
    tabType: 'balance',
  },
];

// =============================================================================
// TIGER ETF (미래에셋자산운용)
// =============================================================================

const TIGER_CAROUSEL_BANNERS: BannerItem[] = [
  {
    id: 1,
    title: 'TIGER 미국테크TOP10 INDXX',
    description: '미국 빅테크 상위 10개 종목 집중 투자',
    subtext: '애플, 엔비디아, 마이크로소프트 등 대형 기술주',
    bgGradient: 'from-orange-600 to-blue-900',
    image: '/images/banners/tiger/banner-tiger-tech10.png',
    iconName: 'Cpu',
    action: '상품 확인하기',
    link: 'https://investments.miraeasset.com/tigeretf/ko/product/search/detail.do?itmCd=381180',
  },
  {
    id: 2,
    title: 'TIGER 미국S&P500',
    description: '미국 대표 500대 기업에 투자',
    subtext: '검증된 지수, 안정적인 미국 시장 투자',
    bgGradient: 'from-orange-600 to-blue-900',
    image: '/images/banners/tiger/banner-tiger-sp500.png',
    iconName: 'TrendingUp',
    action: '상품 확인하기',
    link: 'https://investments.miraeasset.com/tigeretf/ko/product/search/detail.do?itmCd=360750',
  },
  {
    id: 3,
    title: 'TIGER 미국나스닥100',
    description: '기술주 중심 미국 성장주 투자',
    subtext: '나스닥 상위 100개 혁신 기업',
    bgGradient: 'from-orange-600 to-blue-900',
    image: '/images/banners/tiger/banner-tiger-nasdaq100.png',
    iconName: 'BarChart3',
    action: '상품 확인하기',
    link: 'https://investments.miraeasset.com/tigeretf/ko/product/search/detail.do?itmCd=133690',
  },
  {
    id: 4,
    title: 'TIGER 미국배당다우존스',
    description: '월배당 미국 배당성장주 투자',
    subtext: '배당과 성장을 동시에, 다우존스 배당셀렉트',
    bgGradient: 'from-orange-600 to-blue-900',
    image: '/images/banners/tiger/banner-tiger-dividend.png',
    iconName: 'DollarSign',
    action: '상품 확인하기',
    link: 'https://investments.miraeasset.com/tigeretf/ko/product/search/detail.do?itmCd=458730',
  },
];

const TIGER_SMALL_BANNERS: SmallBannerItem[] = [
  {
    id: 1,
    title: 'TIGER 미국반도체',
    description: 'AI 시대, 반도체 수혜주 투자',
    image: '/images/banners/tiger/banner-tiger-semiconductor.png',
    link: 'https://investments.miraeasset.com/tigeretf/ko/product/search/detail.do?itmCd=381170',
    gradient: 'from-orange-500 to-blue-600',
  },
  {
    id: 2,
    title: 'TIGER 미국테크TOP10',
    description: '미국 빅테크 상위 10개 종목',
    image: '/images/banners/tiger/banner-tiger-tech10.png',
    link: 'https://investments.miraeasset.com/tigeretf/ko/product/search/detail.do?itmCd=381180',
    gradient: 'from-orange-500 to-blue-600',
  },
];

const TIGER_TRANSACTION_BANNERS: TransactionBannerItem[] = [
  {
    id: 1,
    title: 'TIGER 미국배당다우존스',
    description: '월배당 ETF로 꾸준한 배당 수익',
    image: '/images/banners/tiger/banner-tiger-dividend.png',
    link: 'https://investments.miraeasset.com/tigeretf/ko/product/search/detail.do?itmCd=458730',
    gradient: 'from-orange-600 to-blue-900',
    tabType: 'dividend',
  },
  {
    id: 2,
    title: 'TIGER 미국S&P500',
    description: '미국 대표 500대 기업에 적립식 투자',
    image: '/images/banners/tiger/banner-tiger-sp500.png',
    link: 'https://investments.miraeasset.com/tigeretf/ko/product/search/detail.do?itmCd=360750',
    gradient: 'from-orange-600 to-blue-900',
    tabType: 'deposit',
  },
  {
    id: 3,
    title: 'TIGER 미국테크TOP10',
    description: '빅테크 상위 10개 종목 집중 투자',
    image: '/images/banners/tiger/banner-tiger-tech10.png',
    link: 'https://investments.miraeasset.com/tigeretf/ko/product/search/detail.do?itmCd=381180',
    gradient: 'from-orange-600 to-blue-900',
    tabType: 'balance',
  },
];

// =============================================================================
// SOL ETF (신한자산운용)
// =============================================================================

const SOL_CAROUSEL_BANNERS: BannerItem[] = [
  {
    id: 1,
    title: 'SOL 미국배당다우존스',
    description: '한국판 SCHD의 대명사',
    subtext: '미국 배당성장주 월배당 ETF',
    bgGradient: 'from-cyan-500 to-blue-900',
    image: '/images/banners/sol/banner-sol-dividend.png',
    iconName: 'DollarSign',
    action: '상품 확인하기',
    link: 'https://www.shinhanamc.com/product/etf/domestic/overview.do',
  },
  {
    id: 2,
    title: 'SOL 미국S&P500',
    description: '미국 대표 500대 기업에 투자',
    subtext: '안정적인 미국 시장 투자의 정석',
    bgGradient: 'from-cyan-500 to-blue-900',
    image: '/images/banners/sol/banner-sol-sp500.png',
    iconName: 'TrendingUp',
    action: '상품 확인하기',
    link: 'https://www.shinhanamc.com/product/etf/domestic/overview.do',
  },
  {
    id: 3,
    title: 'SOL 미국나스닥100',
    description: '기술 혁신 기업에 투자',
    subtext: '나스닥 상위 100개 기업',
    bgGradient: 'from-cyan-500 to-blue-900',
    image: '/images/banners/sol/banner-sol-nasdaq100.png',
    iconName: 'BarChart3',
    action: '상품 확인하기',
    link: 'https://www.shinhanamc.com/product/etf/domestic/overview.do',
  },
  {
    id: 4,
    title: 'SOL 금현물',
    description: '안전자산 금에 직접 투자',
    subtext: '실물 금 투자의 편리함',
    bgGradient: 'from-cyan-500 to-blue-900',
    image: '/images/banners/sol/banner-sol-gold.png',
    iconName: 'Wallet',
    action: '상품 확인하기',
    link: 'https://www.shinhanamc.com/product/etf/domestic/overview.do',
  },
];

const SOL_SMALL_BANNERS: SmallBannerItem[] = [
  {
    id: 1,
    title: 'SOL 미국배당다우존스',
    description: '한국판 SCHD 월배당',
    image: '/images/banners/sol/banner-sol-dividend.png',
    link: 'https://www.shinhanamc.com/product/etf/domestic/overview.do',
    gradient: 'from-cyan-500 to-blue-600',
  },
  {
    id: 2,
    title: 'SOL 금현물',
    description: '안전자산 금 투자',
    image: '/images/banners/sol/banner-sol-gold.png',
    link: 'https://www.shinhanamc.com/product/etf/domestic/overview.do',
    gradient: 'from-cyan-500 to-blue-600',
  },
];

const SOL_TRANSACTION_BANNERS: TransactionBannerItem[] = [
  {
    id: 1,
    title: 'SOL 미국배당다우존스',
    description: '한국판 SCHD로 시작하는 월배당 투자',
    image: '/images/banners/sol/banner-sol-dividend.png',
    link: 'https://www.shinhanamc.com/product/etf/domestic/overview.do',
    gradient: 'from-cyan-500 to-blue-900',
    tabType: 'dividend',
  },
  {
    id: 2,
    title: 'SOL 미국S&P500',
    description: '미국 대표 기업에 적립식 투자',
    image: '/images/banners/sol/banner-sol-sp500.png',
    link: 'https://www.shinhanamc.com/product/etf/domestic/overview.do',
    gradient: 'from-cyan-500 to-blue-900',
    tabType: 'deposit',
  },
  {
    id: 3,
    title: 'SOL 금현물',
    description: '안전자산 금으로 자산 배분',
    image: '/images/banners/sol/banner-sol-gold.png',
    link: 'https://www.shinhanamc.com/product/etf/domestic/overview.do',
    gradient: 'from-cyan-500 to-blue-900',
    tabType: 'balance',
  },
];

// =============================================================================
// KODEX ETF (삼성자산운용)
// =============================================================================

const KODEX_CAROUSEL_BANNERS: BannerItem[] = [
  {
    id: 1,
    title: 'KODEX 미국S&P500',
    description: '미국 대표 지수 투자',
    subtext: '삼성자산운용의 프리미엄 ETF',
    bgGradient: 'from-indigo-600 to-purple-900',
    image: '/images/banners/kodex/banner-kodex-sp500.png',
    iconName: 'TrendingUp',
    action: '상품 확인하기',
    link: 'https://www.kodex.com/product_view.do',
  },
  {
    id: 2,
    title: 'KODEX 미국나스닥100',
    description: '기술주 중심 성장 투자',
    subtext: '혁신 기업 TOP 100',
    bgGradient: 'from-indigo-600 to-purple-900',
    image: '/images/banners/kodex/banner-kodex-nasdaq100.png',
    iconName: 'BarChart3',
    action: '상품 확인하기',
    link: 'https://www.kodex.com/product_view.do',
  },
  {
    id: 3,
    title: 'KODEX 미국배당프리미엄',
    description: '월배당 + 옵션 프리미엄',
    subtext: 'S&P500 상승분과 배당을 동시에',
    bgGradient: 'from-indigo-600 to-purple-900',
    image: '/images/banners/kodex/banner-kodex-dividend.png',
    iconName: 'DollarSign',
    action: '상품 확인하기',
    link: 'https://www.kodex.com/product_view.do',
  },
  {
    id: 4,
    title: 'KODEX 미국반도체',
    description: 'AI 시대 반도체 투자',
    subtext: '글로벌 반도체 리더 기업',
    bgGradient: 'from-indigo-600 to-purple-900',
    image: '/images/banners/kodex/banner-kodex-semiconductor.png',
    iconName: 'Cpu',
    action: '상품 확인하기',
    link: 'https://www.kodex.com/product_view.do',
  },
];

const KODEX_SMALL_BANNERS: SmallBannerItem[] = [
  {
    id: 1,
    title: 'KODEX 미국배당프리미엄',
    description: '월배당 + 프리미엄 수익',
    image: '/images/banners/kodex/banner-kodex-dividend.png',
    link: 'https://www.kodex.com/product_view.do',
    gradient: 'from-indigo-500 to-purple-600',
  },
  {
    id: 2,
    title: 'KODEX 미국반도체',
    description: 'AI 반도체 투자',
    image: '/images/banners/kodex/banner-kodex-semiconductor.png',
    link: 'https://www.kodex.com/product_view.do',
    gradient: 'from-indigo-500 to-purple-600',
  },
];

const KODEX_TRANSACTION_BANNERS: TransactionBannerItem[] = [
  {
    id: 1,
    title: 'KODEX 미국배당프리미엄',
    description: '월배당 + 옵션 프리미엄 전략',
    image: '/images/banners/kodex/banner-kodex-dividend.png',
    link: 'https://www.kodex.com/product_view.do',
    gradient: 'from-indigo-600 to-purple-900',
    tabType: 'dividend',
  },
  {
    id: 2,
    title: 'KODEX 미국S&P500',
    description: '삼성자산운용의 프리미엄 ETF',
    image: '/images/banners/kodex/banner-kodex-sp500.png',
    link: 'https://www.kodex.com/product_view.do',
    gradient: 'from-indigo-600 to-purple-900',
    tabType: 'deposit',
  },
  {
    id: 3,
    title: 'KODEX 미국나스닥100',
    description: '기술주 중심 성장 투자',
    image: '/images/banners/kodex/banner-kodex-nasdaq100.png',
    link: 'https://www.kodex.com/product_view.do',
    gradient: 'from-indigo-600 to-purple-900',
    tabType: 'balance',
  },
];

// =============================================================================
// RISE ETF (KB자산운용)
// =============================================================================

const RISE_CAROUSEL_BANNERS: BannerItem[] = [
  {
    id: 1,
    title: 'RISE 미국S&P500',
    description: '미국 대표 지수 투자',
    subtext: 'KB의 검증된 ETF 라인업',
    bgGradient: 'from-yellow-500 to-amber-800',
    image: '/images/banners/rise/banner-rise-sp500.png',
    iconName: 'TrendingUp',
    action: '상품 확인하기',
    link: 'https://www.kbam.co.kr/etf/etf-product-list.do',
  },
  {
    id: 2,
    title: 'RISE 미국나스닥100',
    description: '기술 혁신 기업에 투자',
    subtext: '미국 기술주 성장 투자',
    bgGradient: 'from-yellow-500 to-amber-800',
    image: '/images/banners/rise/banner-rise-nasdaq100.png',
    iconName: 'BarChart3',
    action: '상품 확인하기',
    link: 'https://www.kbam.co.kr/etf/etf-product-list.do',
  },
  {
    id: 3,
    title: 'RISE 미국배당귀족',
    description: '25년 이상 배당 성장 기업',
    subtext: '배당 귀족 기업에 투자',
    bgGradient: 'from-yellow-500 to-amber-800',
    image: '/images/banners/rise/banner-rise-dividend.png',
    iconName: 'DollarSign',
    action: '상품 확인하기',
    link: 'https://www.kbam.co.kr/etf/etf-product-list.do',
  },
  {
    id: 4,
    title: 'RISE 코스피200',
    description: '한국 대표 지수 투자',
    subtext: '국내 우량주 200개 기업',
    bgGradient: 'from-yellow-500 to-amber-800',
    image: '/images/banners/rise/banner-rise-kospi.png',
    iconName: 'Building2',
    action: '상품 확인하기',
    link: 'https://www.kbam.co.kr/etf/etf-product-list.do',
  },
];

const RISE_SMALL_BANNERS: SmallBannerItem[] = [
  {
    id: 1,
    title: 'RISE 미국배당귀족',
    description: '배당 귀족 기업 투자',
    image: '/images/banners/rise/banner-rise-dividend.png',
    link: 'https://www.kbam.co.kr/etf/etf-product-list.do',
    gradient: 'from-yellow-500 to-amber-600',
  },
  {
    id: 2,
    title: 'RISE 코스피200',
    description: '국내 우량주 투자',
    image: '/images/banners/rise/banner-rise-kospi.png',
    link: 'https://www.kbam.co.kr/etf/etf-product-list.do',
    gradient: 'from-yellow-500 to-amber-600',
  },
];

const RISE_TRANSACTION_BANNERS: TransactionBannerItem[] = [
  {
    id: 1,
    title: 'RISE 미국배당귀족',
    description: '25년 이상 배당 성장 기업에 투자',
    image: '/images/banners/rise/banner-rise-dividend.png',
    link: 'https://www.kbam.co.kr/etf/etf-product-list.do',
    gradient: 'from-yellow-500 to-amber-800',
    tabType: 'dividend',
  },
  {
    id: 2,
    title: 'RISE 미국S&P500',
    description: 'KB의 검증된 ETF로 적립식 투자',
    image: '/images/banners/rise/banner-rise-sp500.png',
    link: 'https://www.kbam.co.kr/etf/etf-product-list.do',
    gradient: 'from-yellow-500 to-amber-800',
    tabType: 'deposit',
  },
  {
    id: 3,
    title: 'RISE 코스피200',
    description: '한국 대표 우량주 200개 기업',
    image: '/images/banners/rise/banner-rise-kospi.png',
    link: 'https://www.kbam.co.kr/etf/etf-product-list.do',
    gradient: 'from-yellow-500 to-amber-800',
    tabType: 'balance',
  },
];

// =============================================================================
// KIWOOM (키움증권)
// =============================================================================

const KIWOOM_CAROUSEL_BANNERS: BannerItem[] = [
  {
    id: 1,
    title: '키움증권 X 서대리',
    description: '서대리 구독자 전용 특별 혜택',
    subtext: '해외주식 환전 우대 95% + $40 즉시 지급',
    bgGradient: 'from-pink-600 to-rose-900',
    image: '/images/banners/kiwoom/banner-kiwoom-event.png',
    iconName: 'Gift',
    action: '이벤트 확인',
    link: 'https://www.kiwoom.com',
  },
  {
    id: 2,
    title: '키움증권 해외주식',
    description: '미국 주식 거래 수수료 0.07%',
    subtext: '업계 최저 수준의 거래 수수료',
    bgGradient: 'from-pink-600 to-rose-900',
    image: '/images/banners/kiwoom/banner-kiwoom-overseas.png',
    iconName: 'TrendingUp',
    action: '거래하기',
    link: 'https://www.kiwoom.com',
  },
  {
    id: 3,
    title: '키움증권 영웅문S',
    description: '국내 최고의 MTS 영웅문',
    subtext: '투자의 시작과 끝을 함께',
    bgGradient: 'from-pink-600 to-rose-900',
    image: '/images/banners/kiwoom/banner-kiwoom-event.png',
    iconName: 'BarChart3',
    action: '앱 다운로드',
    link: 'https://www.kiwoom.com',
  },
];

const KIWOOM_SMALL_BANNERS: SmallBannerItem[] = [
  {
    id: 1,
    title: '키움증권 X 서대리',
    description: '$40 지원금 + 환전 우대',
    image: '/images/banners/kiwoom/banner-kiwoom-event.png',
    link: 'https://www.kiwoom.com',
    gradient: 'from-pink-500 to-rose-600',
  },
  {
    id: 2,
    title: '키움증권 해외주식',
    description: '수수료 0.07%',
    image: '/images/banners/kiwoom/banner-kiwoom-overseas.png',
    link: 'https://www.kiwoom.com',
    gradient: 'from-pink-500 to-rose-600',
  },
];

const KIWOOM_TRANSACTION_BANNERS: TransactionBannerItem[] = [
  {
    id: 1,
    title: '키움증권 배당주 투자',
    description: '해외 배당주 수수료 0.07%',
    image: '/images/banners/kiwoom/banner-kiwoom-overseas.png',
    link: 'https://www.kiwoom.com',
    gradient: 'from-pink-600 to-rose-900',
    tabType: 'dividend',
  },
  {
    id: 2,
    title: '키움증권 계좌 개설',
    description: '$40 지원금 + 환전 95% 우대',
    image: '/images/banners/kiwoom/banner-kiwoom-event.png',
    link: 'https://www.kiwoom.com',
    gradient: 'from-pink-600 to-rose-900',
    tabType: 'deposit',
  },
  {
    id: 3,
    title: '키움증권 X 서대리',
    description: '서대리 구독자 전용 특별 혜택',
    image: '/images/banners/kiwoom/banner-kiwoom-event.png',
    link: 'https://www.kiwoom.com',
    gradient: 'from-pink-600 to-rose-900',
    tabType: 'balance',
  },
];

// =============================================================================
// 배너 데이터 조회 함수
// =============================================================================

// 환경변수에서 provider 가져오기
export function getBannerProvider(): BannerProvider {
  const provider = process.env.NEXT_PUBLIC_BANNER_PROVIDER as BannerProvider;
  if (provider === 'none') {
    return 'none';
  }
  if (['tiger', 'sol', 'kodex', 'rise', 'kiwoom'].includes(provider)) {
    return provider;
  }
  return 'all';
}

// 배너 표시 여부 확인
export function isBannerEnabled(): boolean {
  return getBannerProvider() !== 'none';
}

// 캐러셀 배너 데이터 가져오기
export function getCarouselBanners(provider?: BannerProvider): BannerItem[] {
  const activeProvider = provider ?? getBannerProvider();

  switch (activeProvider) {
    case 'none':
      return [];
    case 'tiger':
      return TIGER_CAROUSEL_BANNERS;
    case 'sol':
      return SOL_CAROUSEL_BANNERS;
    case 'kodex':
      return KODEX_CAROUSEL_BANNERS;
    case 'rise':
      return RISE_CAROUSEL_BANNERS;
    case 'kiwoom':
      return KIWOOM_CAROUSEL_BANNERS;
    case 'all':
    default:
      return ALL_CAROUSEL_BANNERS;
  }
}

// 작은 배너 데이터 가져오기
export function getSmallBanners(provider?: BannerProvider): SmallBannerItem[] {
  const activeProvider = provider ?? getBannerProvider();

  switch (activeProvider) {
    case 'none':
      return [];
    case 'tiger':
      return TIGER_SMALL_BANNERS;
    case 'sol':
      return SOL_SMALL_BANNERS;
    case 'kodex':
      return KODEX_SMALL_BANNERS;
    case 'rise':
      return RISE_SMALL_BANNERS;
    case 'kiwoom':
      return KIWOOM_SMALL_BANNERS;
    case 'all':
    default:
      return ALL_SMALL_BANNERS;
  }
}

// 거래내역 배너 데이터 가져오기
export function getTransactionBanners(provider?: BannerProvider): TransactionBannerItem[] {
  const activeProvider = provider ?? getBannerProvider();

  switch (activeProvider) {
    case 'none':
      return [];
    case 'tiger':
      return TIGER_TRANSACTION_BANNERS;
    case 'sol':
      return SOL_TRANSACTION_BANNERS;
    case 'kodex':
      return KODEX_TRANSACTION_BANNERS;
    case 'rise':
      return RISE_TRANSACTION_BANNERS;
    case 'kiwoom':
      return KIWOOM_TRANSACTION_BANNERS;
    case 'all':
    default:
      return ALL_TRANSACTION_BANNERS;
  }
}

// 특정 탭의 거래내역 배너 가져오기
export function getTransactionBannerByTab(
  tabType: 'dividend' | 'deposit' | 'balance',
  provider?: BannerProvider
): TransactionBannerItem | undefined {
  const banners = getTransactionBanners(provider);
  return banners.find((b) => b.tabType === tabType);
}

// 혜택 배너 데이터 가져오기 (none일 때 null 반환)
export function getBenefitBanner(provider?: BannerProvider): BenefitBannerItem | null {
  const activeProvider = provider ?? getBannerProvider();

  switch (activeProvider) {
    case 'none':
      return null;
    case 'tiger':
      return {
        title: '국내 최다 미국 ETF 라인업',
        highlight: 'TIGER ETF',
        subtitle: '미국테크TOP10 · S&P500 · 나스닥100 · 배당다우존스',
        image: '/images/banners/tiger/banner-tiger-benefit.png',
        link: 'https://investments.miraeasset.com/tigeretf/ko/main/index.do',
        buttonText: 'ETF 둘러보기',
        // TIGER: 오렌지/골드 테마
        bgGradient: 'from-orange-100 via-amber-50 to-orange-50',
        highlightColor: 'text-orange-600',
        buttonBg: 'bg-orange-500',
        buttonHoverBg: 'hover:bg-orange-600',
      };
    case 'sol':
      return {
        title: '월배당으로 꾸준한 현금흐름',
        highlight: 'SOL ETF',
        subtitle: '미국배당다우존스 · 미국S&P500 · 커버드콜 시리즈',
        image: '/images/banners/sol/banner-sol-benefit.png',
        link: 'https://www.shinhanamc.com/product/etf/domestic/overview.do',
        buttonText: 'ETF 둘러보기',
        // SOL: 시안/블루 테마 (신한)
        bgGradient: 'from-cyan-100 via-sky-50 to-blue-50',
        highlightColor: 'text-cyan-600',
        buttonBg: 'bg-cyan-500',
        buttonHoverBg: 'hover:bg-cyan-600',
      };
    case 'kodex':
      return {
        title: '국내 ETF 시장점유율 1위',
        highlight: 'KODEX ETF',
        subtitle: '미국S&P500TR · 미국나스닥100TR · 국내 인덱스 대표',
        image: '/images/banners/kodex/banner-kodex-benefit.png',
        link: 'https://www.kodex.com/product_view.do',
        buttonText: 'ETF 둘러보기',
        // KODEX: 네이비/퍼플 테마 (삼성)
        bgGradient: 'from-indigo-100 via-purple-50 to-violet-50',
        highlightColor: 'text-indigo-600',
        buttonBg: 'bg-indigo-500',
        buttonHoverBg: 'hover:bg-indigo-600',
      };
    case 'rise':
      return {
        title: 'KB금융그룹의 ETF 브랜드',
        highlight: 'RISE ETF',
        subtitle: '미국S&P500 · 미국배당100 · 글로벌리얼티인컴',
        image: '/images/banners/rise/banner-rise-benefit.png',
        link: 'https://www.kbam.co.kr/etf/etf-product-list.do',
        buttonText: 'ETF 둘러보기',
        // RISE: 옐로우/골드 테마 (KB)
        bgGradient: 'from-yellow-100 via-amber-50 to-yellow-50',
        highlightColor: 'text-yellow-600',
        buttonBg: 'bg-yellow-500',
        buttonHoverBg: 'hover:bg-yellow-600',
      };
    case 'kiwoom':
      return {
        title: '서대리 구독자 전용 혜택',
        highlight: '$40 지원금',
        subtitle: '해외주식 환전 우대 95% + 거래수수료 0.07%',
        image: '/images/banners/kiwoom/banner-kiwoom-benefit.png',
        link: 'https://www.kiwoom.com',
        buttonText: '혜택받기',
        // Kiwoom: 핑크/로즈 테마
        bgGradient: 'from-pink-100 via-rose-50 to-pink-50',
        highlightColor: 'text-pink-600',
        buttonBg: 'bg-pink-500',
        buttonHoverBg: 'hover:bg-pink-600',
      };
    case 'all':
    default:
      return {
        title: '서대리 구독자 전용 혜택',
        highlight: '$40 지원금',
        subtitle: '해외주식 환전 우대 95% + 거래수수료 0.07%',
        image: '/images/banners/kiwoom/banner-kiwoom-benefit.png',
        link: 'https://www.kiwoom.com',
        buttonText: '혜택받기',
        // 기본: 핑크/로즈 테마
        bgGradient: 'from-pink-100 via-rose-50 to-pink-50',
        highlightColor: 'text-pink-600',
        buttonBg: 'bg-pink-500',
        buttonHoverBg: 'hover:bg-pink-600',
      };
  }
}
