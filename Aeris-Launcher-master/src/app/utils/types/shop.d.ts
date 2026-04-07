export type ShopItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  regularPrice?: number;
  offerId?: string;
  section?: "featured" | "daily";
  isBundle?: boolean;
  introduction?: { chapter: string; season: string; text: string };
  bundleItems?: Array<{
    id: string;
    name: string;
    type: { value: string; displayValue: string };
    rarity: { value: string; displayValue: string };
    images: { icon: string; featured?: string; smallIcon?: string };
  }>;
  images: {
    featured?: string;
    icon: string;
    smallIcon?: string;
  };
  rarity: {
    value: string;
    displayValue: string;
  };
  type?: {
    value: string;
    displayValue: string;
  };
};
