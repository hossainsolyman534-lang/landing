export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  comparePrice?: number;
  images: string[];
  landingPage: {
    heroTitle: string;
    heroSubtitle: string;
    features: { title: string; description: string; icon?: string }[];
    testimonials: { name: string; text: string; rating: number }[];
    faq: { question: string; answer: string }[];
    videoUrl?: string;
  };
  upsells: string[];
  crossSells: string[];
  inventoryCount: number;
  status: 'active' | 'draft' | 'out_of_stock';
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: { productId: string; name: string; price: number; quantity: number }[];
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'incompatible';
  courierDetails?: {
    courierName: string;
    trackingNumber: string;
    status: string;
  };
  createdAt: any;
  trackingData?: {
    pixelSent: boolean;
    gtmSent: boolean;
    claritySent: boolean;
  };
}

export interface InventoryLog {
  id: string;
  productId: string;
  change: number;
  reason: string;
  timestamp: any;
}

export interface Account {
  id: string;
  name: string;
  balance: number;
  type: 'bank' | 'mobile_money' | 'cash';
}

export interface TrackingConfig {
  pixelId: string;
  gtmId: string;
  clarityId: string;
}
