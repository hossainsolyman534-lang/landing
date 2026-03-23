import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Product, TrackingConfig } from '../types';
import { motion } from 'motion/react';
import { ShoppingCart, CheckCircle, Star, Play, ChevronDown, Facebook, MessageCircle, Phone } from 'lucide-react';

interface LandingPageProps {
  trackingConfig: TrackingConfig | null;
}

declare global {
  interface Window {
    clarity: any;
    dataLayer: any[];
    fbq: any;
    _fbq: any;
  }
}

export default function LandingPage({ trackingConfig }: LandingPageProps) {
  const { productId } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [orderForm, setOrderForm] = useState({ name: '', phone: '', address: '' });
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [scrollDepth, setScrollDepth] = useState(0);
  const [trackedDepths, setTrackedDepths] = useState<number[]>([]);

  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!productId) return;
      const docRef = doc(db, 'products', productId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const prodData = { id: docSnap.id, ...docSnap.data() } as Product;
        setProduct(prodData);
        
        // Fetch upsells/cross-sells
        const relatedIds = [...(prodData.upsells || []), ...(prodData.crossSells || [])];
        if (relatedIds.length > 0) {
          const related = await Promise.all(relatedIds.map(async (id) => {
            const d = await getDoc(doc(db, 'products', id));
            return d.exists() ? { id: d.id, ...d.data() } as Product : null;
          }));
          setRelatedProducts(related.filter(p => p !== null) as Product[]);
        }
      }
      setLoading(false);
    };
    fetchProduct();
  }, [productId]);

  // Tracking Logic
  useEffect(() => {
    if (!trackingConfig) return;

    // Microsoft Clarity
    if (trackingConfig.clarityId) {
      const clarityScript = document.createElement('script');
      clarityScript.async = true;
      clarityScript.src = `https://www.clarity.ms/tag/${trackingConfig.clarityId}`;
      document.head.appendChild(clarityScript);
      (window as any).clarity = (window as any).clarity || function() {
        ((window as any).clarity.q = (window as any).clarity.q || []).push(arguments);
      };
    }

    // Google Tag Manager
    if (trackingConfig.gtmId) {
      const gtmScript = document.createElement('script');
      gtmScript.async = true;
      gtmScript.src = `https://www.googletagmanager.com/gtm.js?id=${trackingConfig.gtmId}`;
      document.head.appendChild(gtmScript);
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    }

    // Facebook Pixel
    if (trackingConfig.pixelId) {
      const fbScript = document.createElement('script');
      fbScript.async = true;
      fbScript.src = 'https://connect.facebook.net/en_US/fbevents.js';
      document.head.appendChild(fbScript);
      
      window.fbq = window.fbq || function() {
        (window.fbq.q = window.fbq.q || []).push(arguments);
      };
      if (!window._fbq) window._fbq = window.fbq;
      window.fbq.push = window.fbq;
      window.fbq.loaded = true;
      window.fbq.version = '2.0';
      window.fbq.queue = [];
      
      window.fbq('init', trackingConfig.pixelId);
      window.fbq('track', 'PageView');
    }
  }, [trackingConfig]);

  // Scroll Depth Tracking
  useEffect(() => {
    const handleScroll = () => {
      const winHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const trackableHeight = docHeight - winHeight;
      const currentDepth = Math.round((scrollTop / trackableHeight) * 100);

      [50, 75, 95].forEach(depth => {
        if (currentDepth >= depth && !trackedDepths.includes(depth)) {
          setTrackedDepths(prev => [...prev, depth]);
          console.log(`Scroll Depth Reached: ${depth}%`);
          if (window.fbq) window.fbq('trackCustom', `ScrollDepth_${depth}`);
          if (window.dataLayer) window.dataLayer.push({ event: 'scroll_depth', depth });
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [trackedDepths]);

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    try {
      await addDoc(collection(db, 'orders'), {
        customerName: orderForm.name,
        customerPhone: orderForm.phone,
        customerAddress: orderForm.address,
        items: [{ productId: product.id, name: product.name, price: product.price, quantity: 1 }],
        totalAmount: product.price,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setOrderSuccess(true);
      if (window.fbq) window.fbq('track', 'Purchase', { value: product.price, currency: 'USD' });
    } catch (error) {
      console.error("Order error:", error);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!product) return <div className="flex items-center justify-center h-screen">Product not found</div>;

  const { landingPage } = product;

  return (
    <div className="bg-white text-gray-900 overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center bg-black text-white overflow-hidden">
        <div className="absolute inset-0 opacity-40">
          <img src={product.images[0]} alt="Hero" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        </div>
        <div className="relative z-10 text-center px-4 max-w-4xl">
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-black mb-6 uppercase tracking-tighter"
          >
            {landingPage.heroTitle}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl md:text-2xl mb-10 text-gray-300 font-light"
          >
            {landingPage.heroSubtitle}
          </motion.p>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => document.getElementById('order-form')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-10 py-5 bg-blue-600 text-white font-bold rounded-full text-lg uppercase tracking-widest hover:bg-blue-700 transition shadow-2xl"
          >
            Order Now - ${product.price}
          </motion.button>
        </div>
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown size={32} />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
          {landingPage.features.map((feature, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="bg-white p-10 rounded-3xl shadow-sm border border-gray-100"
            >
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                <CheckCircle size={32} />
              </div>
              <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
              <p className="text-gray-600 leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Video Section */}
      {landingPage.videoUrl && (
        <section className="py-24 px-4 bg-white">
          <div className="max-w-5xl mx-auto rounded-3xl overflow-hidden shadow-2xl relative aspect-video bg-black">
            <iframe 
              src={landingPage.videoUrl.replace('watch?v=', 'embed/')} 
              className="w-full h-full"
              allowFullScreen
            ></iframe>
          </div>
        </section>
      )}

      {/* Testimonials */}
      <section className="py-24 px-4 bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold mb-16 text-center">What Our Customers Say</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {landingPage.testimonials.map((t, i) => (
              <div key={i} className="bg-gray-800 p-8 rounded-3xl border border-gray-700">
                <div className="flex mb-4">
                  {[...Array(t.rating)].map((_, i) => <Star key={i} size={20} className="text-yellow-400 fill-current" />)}
                </div>
                <p className="text-lg italic mb-6 text-gray-300">"{t.text}"</p>
                <p className="font-bold text-blue-400">— {t.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Related Products (Upsells/Cross-sells) */}
      {relatedProducts.length > 0 && (
        <section className="py-24 px-4 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold mb-12 text-center uppercase tracking-tight">You Might Also Like</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {relatedProducts.map(p => (
                <div key={p.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition">
                  <img src={p.images[0]} alt={p.name} className="w-full h-48 object-cover rounded-2xl mb-4" referrerPolicy="no-referrer" />
                  <h3 className="font-bold text-lg mb-2">{p.name}</h3>
                  <p className="text-blue-600 font-black mb-4">${p.price}</p>
                  <a href={`/product/${p.id}`} className="block text-center py-3 bg-gray-900 text-white rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-black transition">View Product</a>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Order Form */}
      <section id="order-form" className="py-24 px-4 bg-white">
        <div className="max-w-xl mx-auto bg-white p-10 rounded-3xl shadow-2xl border border-gray-100">
          <h2 className="text-3xl font-bold mb-8 text-center">Order Your {product.name}</h2>
          {orderSuccess ? (
            <div className="text-center py-10">
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={48} />
              </div>
              <h3 className="text-2xl font-bold mb-2">Order Placed Successfully!</h3>
              <p className="text-gray-600">We will contact you shortly for confirmation.</p>
            </div>
          ) : (
            <form onSubmit={handleOrder} className="space-y-6">
              <div>
                <label className="block text-sm font-bold mb-2 uppercase tracking-wide">Full Name</label>
                <input 
                  required
                  type="text" 
                  value={orderForm.name}
                  onChange={e => setOrderForm({...orderForm, name: e.target.value})}
                  className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Enter your name"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2 uppercase tracking-wide">Phone Number</label>
                <input 
                  required
                  type="tel" 
                  value={orderForm.phone}
                  onChange={e => setOrderForm({...orderForm, phone: e.target.value})}
                  className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Enter your phone"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2 uppercase tracking-wide">Delivery Address</label>
                <textarea 
                  required
                  value={orderForm.address}
                  onChange={e => setOrderForm({...orderForm, address: e.target.value})}
                  className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none h-32"
                  placeholder="Enter your full address"
                ></textarea>
              </div>
              <button 
                type="submit"
                className="w-full py-5 bg-blue-600 text-white font-bold rounded-xl text-lg uppercase tracking-widest hover:bg-blue-700 transition shadow-lg"
              >
                Confirm Order - ${product.price}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-gray-50 border-t border-gray-200 text-center">
        <div className="flex justify-center space-x-6 mb-8">
          <Facebook className="text-gray-400 hover:text-blue-600 cursor-pointer" />
          <MessageCircle className="text-gray-400 hover:text-green-500 cursor-pointer" />
          <Phone className="text-gray-400 hover:text-blue-500 cursor-pointer" />
        </div>
        <p className="text-gray-500 text-sm">© 2026 LandingCommerce. All rights reserved.</p>
      </footer>
    </div>
  );
}
