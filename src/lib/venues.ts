export const VENUES = [
  '桐生', '戸田', '江戸川', '平和島', '多摩川', '浜名湖',
  '蒲郡', '常滑', '津', '三国', 'びわこ', '住之江',
  '尼崎', '鳴門', '丸亀', '児島', '宮島', '徳山',
  '下関', '若松', '芦屋', '福岡', '唐津', '大村'
];

export const KEIBA_VENUES = [
  '札幌', '函館', '福島', '新潟', '東京', '中山', '中京', '京都', '阪神', '小倉'
];

export const KEIRIN_VENUES = [
  '函館', '青森', 'いわき平', '弥彦', '前橋', '取手', '宇都宮', '大宮', '西武園', '京王閣',
  '立川', '松戸', '千葉', '川崎', '平塚', '小田原', '伊東', '静岡', '名古屋', '岐阜',
  '大垣', '豊橋', '富山', '松阪', '四日市', '福井', '奈良', '向日町', '和歌山', '岸和田',
  '玉野', '広島', '防府', '高松', '小松島', '高知', '松山', '小倉', '久留米', '武雄',
  '佐世保', '別府', '熊本'
];

export const AUTO_VENUES = ['川口', '伊勢崎', '浜松', '山陽', '飯塚'];

export type SportType = '競艇' | '競馬' | '競輪' | 'オート';

export const SPORT_VENUES: Record<SportType, string[]> = {
  競艇: VENUES,
  競馬: KEIBA_VENUES,
  競輪: KEIRIN_VENUES,
  オート: AUTO_VENUES
};

// 公式サイトのjcdパラメータ（VENUESと同じ並び順、1始まり=01〜24）競艇のみで使用
export function venueCode(venue: string): string {
  const i = VENUES.indexOf(venue);
  return String(i + 1).padStart(2, '0');
}
