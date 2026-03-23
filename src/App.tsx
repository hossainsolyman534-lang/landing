import { BrowserRouter as Router, Routes, Route, useParams } from 'react-router-dom';
import { useEffect, useState, Component, ErrorInfo, ReactNode } from 'react';
import { collection, getDocs, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import { Product, TrackingConfig } from './types';
import LandingPage from './components/LandingPage';
import AdminPanel from './components/AdminPanel';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-red-50 p-10 text-center">
          <h1 className="text-3xl font-bold text-red-600 mb-4">Something went wrong.</h1>
          <p className="text-gray-600 mb-8">Please try refreshing the page or contact support if the problem persists.</p>
          <button onClick={() => window.location.reload()} className="px-6 py-2 bg-red-600 text-white rounded-lg">Refresh Page</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [trackingConfig, setTrackingConfig] = useState<TrackingConfig | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    // Fetch tracking config
    const fetchTracking = async () => {
      const docRef = doc(db, 'config', 'tracking');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setTrackingConfig(docSnap.data() as TrackingConfig);
      }
    };
    fetchTracking();

    return () => unsubscribe();
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen bg-gray-50 font-sans">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/product/:productId" element={<LandingPage trackingConfig={trackingConfig} />} />
            <Route path="/admin/*" element={
              user && user.email === "hossainsolyman534@gmail.com" ? (
                <AdminPanel user={user} logout={logout} />
              ) : (
                <div className="flex flex-col items-center justify-center h-screen">
                  <h1 className="text-2xl font-bold mb-4 text-gray-900 uppercase tracking-tighter">Admin Access Required</h1>
                  <button onClick={login} className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-blue-700 transition shadow-lg">
                    Login with Google
                  </button>
                </div>
              )
            } />
          </Routes>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

function Home() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'products'), where('status', '==', 'active'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
      setProducts(productsData);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-8 text-center">Our Products</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {products.map(product => (
          <div key={product.id} className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition">
            <img src={product.images[0] || 'https://picsum.photos/seed/product/400/300'} alt={product.name} className="w-full h-48 object-cover" referrerPolicy="no-referrer" />
            <div className="p-6">
              <h2 className="text-xl font-bold mb-2">{product.name}</h2>
              <p className="text-gray-600 mb-4 line-clamp-2">{product.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-blue-600">${product.price}</span>
                <a href={`/product/${product.id}`} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                  View Landing Page
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
