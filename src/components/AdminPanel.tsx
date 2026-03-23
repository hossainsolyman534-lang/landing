import { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc, setDoc, query, orderBy, getDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Product, Order, InventoryLog, Account, TrackingConfig } from '../types';
import { 
  LayoutDashboard, Package, ShoppingBag, Truck, CreditCard, Settings, 
  Plus, Edit, Trash2, Check, X, AlertCircle, TrendingUp, Users, DollarSign,
  LogOut, ExternalLink
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface AdminPanelProps {
  user: any;
  logout: () => void;
}

export default function AdminPanel({ user, logout }: AdminPanelProps) {
  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col shadow-2xl z-20">
        <div className="p-8 border-b border-gray-800">
          <h1 className="text-2xl font-black uppercase tracking-tighter text-blue-400">LandingCommerce</h1>
          <p className="text-xs text-gray-500 mt-1 font-mono uppercase tracking-widest">Admin Control</p>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <SidebarLink to="/admin" icon={<LayoutDashboard size={20} />} label="Dashboard" />
          <SidebarLink to="/admin/products" icon={<Package size={20} />} label="Products" />
          <SidebarLink to="/admin/orders" icon={<ShoppingBag size={20} />} label="Orders" />
          <SidebarLink to="/admin/courier" icon={<Truck size={20} />} label="Courier" />
          <SidebarLink to="/admin/inventory" icon={<AlertCircle size={20} />} label="Inventory" />
          <SidebarLink to="/admin/accounts" icon={<CreditCard size={20} />} label="Accounts" />
          <SidebarLink to="/admin/tracking" icon={<Settings size={20} />} label="Tracking Config" />
        </nav>
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center space-x-3 mb-4 p-2">
            <img src={user.photoURL} className="w-10 h-10 rounded-full border-2 border-blue-500" alt="Admin" referrerPolicy="no-referrer" />
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate">{user.displayName}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
          <button onClick={logout} className="w-full flex items-center justify-center space-x-2 p-3 bg-red-900/30 text-red-400 rounded-xl hover:bg-red-900/50 transition border border-red-900/50">
            <LogOut size={18} />
            <span className="font-bold uppercase text-xs tracking-widest">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-10 relative">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<ProductManagement />} />
          <Route path="/orders" element={<OrderManagement />} />
          <Route path="/courier" element={<CourierManagement />} />
          <Route path="/inventory" element={<InventoryManagement />} />
          <Route path="/accounts" element={<AccountManagement />} />
          <Route path="/tracking" element={<TrackingManagement />} />
        </Routes>
      </main>
    </div>
  );
}

function SidebarLink({ to, icon, label }: { to: string; icon: any; label: string }) {
  return (
    <Link to={to} className="flex items-center space-x-3 p-4 rounded-xl hover:bg-gray-800 transition group">
      <span className="text-gray-400 group-hover:text-blue-400 transition">{icon}</span>
      <span className="font-medium text-sm tracking-wide">{label}</span>
    </Link>
  );
}

function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const unsubOrders = onSnapshot(collection(db, 'orders'), (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Order[]);
    });
    const unsubProducts = onSnapshot(collection(db, 'products'), (snap) => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Product[]);
    });
    return () => { unsubOrders(); unsubProducts(); };
  }, []);

  const totalRevenue = orders.reduce((acc, o) => acc + (o.status === 'delivered' ? o.totalAmount : 0), 0);
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const outOfStock = products.filter(p => p.inventoryCount <= 0).length;

  const chartData = orders.slice(-10).map(o => ({
    date: new Date(o.createdAt?.toDate()).toLocaleDateString(),
    amount: o.totalAmount
  }));

  return (
    <div className="space-y-10">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tighter">Dashboard</h2>
          <p className="text-gray-500 font-medium">Welcome back to your command center.</p>
        </div>
        <div className="flex space-x-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex items-center space-x-4">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Live Revenue</p>
              <p className="text-xl font-black">${totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <StatCard title="Total Orders" value={orders.length} icon={<ShoppingBag />} color="blue" />
        <StatCard title="Pending Orders" value={pendingOrders} icon={<AlertCircle />} color="yellow" />
        <StatCard title="Out of Stock" value={outOfStock} icon={<Package />} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200">
          <h3 className="text-xl font-bold mb-8 uppercase tracking-tight">Recent Sales Performance</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                />
                <Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorAmount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200">
          <h3 className="text-xl font-bold mb-8 uppercase tracking-tight">Clarity Insights</h3>
          <div className="bg-gray-50 h-80 rounded-2xl flex flex-col items-center justify-center text-center p-10 border-2 border-dashed border-gray-200">
            <ExternalLink size={48} className="text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium mb-6">Microsoft Clarity dashboard is best viewed in its native environment.</p>
            <a 
              href="https://clarity.microsoft.com/" 
              target="_blank" 
              className="px-6 py-3 bg-gray-900 text-white rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-black transition shadow-lg"
            >
              Open Clarity Dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string; value: any; icon: any; color: string }) {
  const colors: any = {
    blue: "bg-blue-50 text-blue-600",
    red: "bg-red-50 text-red-600",
    yellow: "bg-yellow-50 text-yellow-600",
    green: "bg-green-50 text-green-600",
  };
  return (
    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200 flex items-center space-x-6">
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${colors[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mb-1">{title}</p>
        <p className="text-3xl font-black">{value}</p>
      </div>
    </div>
  );
}

function ProductManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '', price: 0, status: 'draft', images: [], inventoryCount: 0,
    landingPage: { heroTitle: '', heroSubtitle: '', features: [], testimonials: [], faq: [] },
    upsells: [], crossSells: []
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'products'), (snap) => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Product[]);
    });
    return unsub;
  }, []);

  const saveProduct = async () => {
    if (!newProduct.name || !newProduct.price) return;
    try {
      if (newProduct.id) {
        await updateDoc(doc(db, 'products', newProduct.id), newProduct);
      } else {
        await addDoc(collection(db, 'products'), newProduct);
      }
      setIsAdding(false);
      setNewProduct({
        name: '', price: 0, status: 'draft', images: [], inventoryCount: 0,
        landingPage: { heroTitle: '', heroSubtitle: '', features: [], testimonials: [], faq: [] },
        upsells: [], crossSells: []
      });
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <h2 className="text-3xl font-black uppercase tracking-tighter">Product Inventory</h2>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-blue-700 transition shadow-lg"
        >
          <Plus size={18} />
          <span>Add New Product</span>
        </button>
      </header>

      {isAdding && (
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-200 space-y-6">
          <h3 className="text-xl font-bold uppercase mb-4">Product Details</h3>
          <div className="grid grid-cols-2 gap-6">
            <input 
              placeholder="Product Name" 
              className="p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              value={newProduct.name}
              onChange={e => setNewProduct({...newProduct, name: e.target.value})}
            />
            <input 
              type="number" 
              placeholder="Price" 
              className="p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              value={newProduct.price}
              onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})}
            />
            <input 
              placeholder="Hero Title" 
              className="p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              value={newProduct.landingPage?.heroTitle}
              onChange={e => setNewProduct({...newProduct, landingPage: {...newProduct.landingPage!, heroTitle: e.target.value}})}
            />
            <input 
              placeholder="Hero Subtitle" 
              className="p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              value={newProduct.landingPage?.heroSubtitle}
              onChange={e => setNewProduct({...newProduct, landingPage: {...newProduct.landingPage!, heroSubtitle: e.target.value}})}
            />
          </div>
          <div className="flex justify-end space-x-4">
            <button onClick={() => setIsAdding(false)} className="px-6 py-3 text-gray-500 font-bold uppercase text-xs tracking-widest">Cancel</button>
            <button onClick={saveProduct} className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold uppercase text-xs tracking-widest shadow-lg">Save Product</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {products.map(p => (
          <div key={p.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between hover:border-blue-200 transition">
            <div className="flex items-center space-x-6">
              <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden">
                <img src={p.images[0] || 'https://picsum.photos/seed/p/100/100'} className="w-full h-full object-cover" alt={p.name} referrerPolicy="no-referrer" />
              </div>
              <div>
                <h4 className="font-bold text-lg">{p.name}</h4>
                <p className="text-sm text-gray-500">${p.price} • {p.inventoryCount} in stock</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button 
                onClick={() => { setNewProduct(p); setIsAdding(true); }}
                className="p-3 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition"
              >
                <Edit size={20} />
              </button>
              <button 
                onClick={() => deleteDoc(doc(db, 'products', p.id))}
                className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OrderManagement() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'orders'), orderBy('createdAt', 'desc')), (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Order[]);
    });
    return unsub;
  }, []);

  const updateStatus = async (id: string, status: string) => {
    await updateDoc(doc(db, 'orders', id), { status });
  };

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-black uppercase tracking-tighter">Order Management</h2>
      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="p-6 text-xs font-bold uppercase tracking-widest text-gray-400">Customer</th>
              <th className="p-6 text-xs font-bold uppercase tracking-widest text-gray-400">Items</th>
              <th className="p-6 text-xs font-bold uppercase tracking-widest text-gray-400">Total</th>
              <th className="p-6 text-xs font-bold uppercase tracking-widest text-gray-400">Status</th>
              <th className="p-6 text-xs font-bold uppercase tracking-widest text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders.map(o => (
              <tr key={o.id} className="hover:bg-gray-50 transition">
                <td className="p-6">
                  <p className="font-bold">{o.customerName}</p>
                  <p className="text-xs text-gray-500">{o.customerPhone}</p>
                </td>
                <td className="p-6">
                  <p className="text-sm">{o.items.map(i => `${i.name} x${i.quantity}`).join(', ')}</p>
                </td>
                <td className="p-6 font-bold">${o.totalAmount}</td>
                <td className="p-6">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    o.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    o.status === 'delivered' ? 'bg-green-100 text-green-700' :
                    o.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {o.status}
                  </span>
                </td>
                <td className="p-6">
                  <select 
                    value={o.status}
                    onChange={(e) => updateStatus(o.id, e.target.value)}
                    className="text-xs font-bold bg-gray-100 p-2 rounded-lg outline-none"
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="incompatible">Incompatible</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CourierManagement() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'orders'), where('status', 'in', ['confirmed', 'shipped'])), (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Order[]);
    });
    return unsub;
  }, []);

  const updateCourier = async (id: string, courier: string, tracking: string) => {
    await updateDoc(doc(db, 'orders', id), {
      courierDetails: { courierName: courier, trackingNumber: tracking, status: 'in_transit' },
      status: 'shipped'
    });
  };

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-black uppercase tracking-tighter">Courier Logistics</h2>
      <div className="grid grid-cols-1 gap-6">
        {orders.map(o => (
          <div key={o.id} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Order #{o.id.slice(0,8)}</p>
              <h4 className="text-xl font-bold">{o.customerName}</h4>
              <p className="text-sm text-gray-500">{o.customerAddress}</p>
            </div>
            <div className="flex flex-col md:flex-row gap-4">
              <input 
                placeholder="Courier Name" 
                className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none"
                defaultValue={o.courierDetails?.courierName}
                onBlur={(e) => updateCourier(o.id, e.target.value, o.courierDetails?.trackingNumber || '')}
              />
              <input 
                placeholder="Tracking #" 
                className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none"
                defaultValue={o.courierDetails?.trackingNumber}
                onBlur={(e) => updateCourier(o.id, o.courierDetails?.courierName || '', e.target.value)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InventoryManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [logs, setLogs] = useState<InventoryLog[]>([]);

  useEffect(() => {
    onSnapshot(collection(db, 'products'), (snap) => setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Product[]));
    onSnapshot(query(collection(db, 'inventory_logs'), orderBy('timestamp', 'desc')), (snap) => setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })) as InventoryLog[]));
  }, []);

  return (
    <div className="space-y-10">
      <h2 className="text-3xl font-black uppercase tracking-tighter">Inventory & Stock</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200">
          <h3 className="text-xl font-bold mb-6 uppercase tracking-tight">Stock Levels</h3>
          <div className="space-y-4">
            {products.map(p => (
              <div key={p.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                <span className="font-bold">{p.name}</span>
                <span className={`font-black px-4 py-1 rounded-full ${p.inventoryCount < 5 ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                  {p.inventoryCount}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200">
          <h3 className="text-xl font-bold mb-6 uppercase tracking-tight">Movement Logs</h3>
          <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
            {logs.map(l => (
              <div key={l.id} className="text-sm p-4 border-b border-gray-100 flex justify-between">
                <div>
                  <p className="font-bold">{l.reason}</p>
                  <p className="text-xs text-gray-400">{new Date(l.timestamp?.toDate()).toLocaleString()}</p>
                </div>
                <span className={`font-black ${l.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {l.change > 0 ? '+' : ''}{l.change}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AccountManagement() {
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    onSnapshot(collection(db, 'accounts'), (snap) => setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Account[]));
  }, []);

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-black uppercase tracking-tighter">Financial Accounts</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {accounts.map(a => (
          <div key={a.id} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <CreditCard size={24} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest bg-gray-100 px-3 py-1 rounded-full text-gray-500">{a.type}</span>
            </div>
            <h4 className="text-lg font-bold mb-1">{a.name}</h4>
            <p className="text-3xl font-black">${a.balance.toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrackingManagement() {
  const [config, setConfig] = useState<TrackingConfig>({ pixelId: '', gtmId: '', clarityId: '' });

  useEffect(() => {
    const fetch = async () => {
      const snap = await getDoc(doc(db, 'config', 'tracking'));
      if (snap.exists()) setConfig(snap.data() as TrackingConfig);
    };
    fetch();
  }, []);

  const save = async () => {
    await setDoc(doc(db, 'config', 'tracking'), config);
    alert('Tracking configuration saved!');
  };

  return (
    <div className="max-w-2xl space-y-8">
      <h2 className="text-3xl font-black uppercase tracking-tighter">Tracking Configuration</h2>
      <div className="bg-white p-10 rounded-3xl shadow-sm border border-gray-200 space-y-8">
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Facebook Pixel ID</label>
          <input 
            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            value={config.pixelId}
            onChange={e => setConfig({...config, pixelId: e.target.value})}
            placeholder="e.g. 1234567890"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Google Tag Manager ID</label>
          <input 
            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            value={config.gtmId}
            onChange={e => setConfig({...config, gtmId: e.target.value})}
            placeholder="e.g. GTM-XXXXXX"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Microsoft Clarity ID</label>
          <input 
            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            value={config.clarityId}
            onChange={e => setConfig({...config, clarityId: e.target.value})}
            placeholder="e.g. abcdefghij"
          />
        </div>
        <button 
          onClick={save}
          className="w-full py-5 bg-blue-600 text-white font-bold rounded-xl text-lg uppercase tracking-widest hover:bg-blue-700 transition shadow-lg"
        >
          Save Configuration
        </button>
      </div>
    </div>
  );
}
