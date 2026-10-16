import React, { useState } from 'react';
import {
  Menu,
  ShoppingCart,
  Search,
  PackageCheck,
  LayoutDashboard,
  LogOut,
  ChevronDown,
  X,
  Phone,
  MessageCircle,
  Leaf,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { scrollToProducts } from '../lib/scroll';

const hideScrollbar = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

export const Header: React.FC = () => {
  const {
    cartCount,
    cartTotal,
    settings,
    setIsCartOpen,
    searchQuery,
    setSearchQuery,
    categories,
    selectedCategory,
    setSelectedCategory,
    closeProductDetail,
    openTrackOrder,
    openAdminDashboard,
    isAdmin,
    user,
    logout,
    openAuthModal,
  } = useStore();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const freeDeliveryThreshold = settings.free_delivery_threshold || 999;
  const diffToFree = Math.max(0, freeDeliveryThreshold - cartTotal);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    closeProductDetail();
    setIsMobileMenuOpen(false);
    scrollToProducts();
  };

  const navCategories =
    categories.length > 0
      ? [
          { label: 'All Products', slug: null },
          ...categories.map((c) => ({
            label: c.name,
            slug: c.slug,
          })),
        ]
      : [{ label: 'All Products', slug: null }];

  return (
    <header className="sticky top-0 z-40 w-full bg-white shadow-xs">
      {/* 1. Top Notice Strip with Details Dropdown (Matching Screenshot 2) */}
      <div className="bg-[#165020] text-white text-[11px] sm:text-xs py-2 px-3 tracking-wide relative z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-medium overflow-x-auto whitespace-nowrap">
            <span className="text-sm">🚚</span>
            <span>৳৯৯৯+ orders get FREE delivery</span>
            <span className="text-emerald-300">→</span>
            <span>৳১,৯৯৯+ orders get 5% Extra OFF</span>
          </div>

          <button
            onClick={() => setIsDetailsOpen(!isDetailsOpen)}
            className="flex items-center gap-1 text-xs font-bold text-[#E5A016] hover:underline cursor-pointer shrink-0 bg-black/20 px-2.5 py-1 rounded-full"
          >
            <span>Details</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isDetailsOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Expandable Details Dropdown Card (Matching Screenshot 2) */}
        {isDetailsOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-2xs" onClick={() => setIsDetailsOpen(false)} />
            <div className="absolute left-0 right-0 top-full mt-0 bg-white text-gray-900 border-b border-gray-200 shadow-2xl p-4 sm:p-6 z-50 animate-fadeIn">
              <div className="max-w-3xl mx-auto space-y-4 text-center">
                <div className="flex items-center justify-center gap-2 text-sm sm:text-base font-black text-[#185824]">
                  <span>🎁</span>
                  <span>Spend more, save more</span>
                </div>
                <p className="text-xs text-gray-500">Applied automatically at checkout</p>

                {/* Visual Milestone Progress */}
                <div className="relative flex items-center justify-between max-w-md mx-auto my-4 px-6">
                  <div className="absolute left-10 right-10 top-1/2 -translate-y-1/2 h-1 bg-emerald-200 z-0" />
                  <div
                    className="absolute left-10 top-1/2 -translate-y-1/2 h-1 bg-[#278838] z-0 transition-all duration-500"
                    style={{ width: cartTotal >= 1999 ? '100%' : cartTotal >= 999 ? '50%' : '10%' }}
                  />

                  <div className="relative z-10 flex flex-col items-center bg-white px-2">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 text-[#185824] flex items-center justify-center shadow-xs text-base">
                      🚚
                    </div>
                    <span className="text-[10px] sm:text-xs font-bold text-gray-800 mt-1">৳999+</span>
                    <span className="text-[9px] text-gray-500">FREE delivery</span>
                  </div>

                  <div className="relative z-10 flex flex-col items-center bg-white px-2">
                    <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shadow-xs text-base">
                      🎁
                    </div>
                    <span className="text-[10px] sm:text-xs font-bold text-gray-800 mt-1">৳1,999+</span>
                    <span className="text-[9px] text-gray-500">5% Extra OFF</span>
                  </div>
                </div>

                {/* Cart status message matching Screenshot 2 */}
                <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3 text-xs text-amber-900 font-medium">
                  You have <strong className="font-bold">৳{cartTotal}</strong> in your cart —{' '}
                  {diffToFree > 0 ? (
                    <span>add <strong className="font-bold text-[#185824]">৳{diffToFree}</strong> more to get FREE delivery</span>
                  ) : (
                    <span className="text-emerald-700 font-bold">🎉 FREE Delivery Unlocked!</span>
                  )}
                </div>

                <button
                  onClick={() => setIsDetailsOpen(false)}
                  className="px-6 py-2.5 bg-[#185824] hover:bg-[#12431C] text-white text-xs font-bold rounded-full shadow-md transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <span>Start shopping</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 2. Main Brand Header (Hamburger | Logo | Cart with Yellow Badge) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3 sm:gap-6">
        {/* Left: Hamburger Menu (Mobile & Desktop) */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 text-[#185824] hover:bg-emerald-50 rounded-xl cursor-pointer transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6 stroke-[2.2]" />
            ) : (
              <Menu className="w-6 h-6 stroke-[2.2]" />
            )}
          </button>
        </div>

        {/* Center: Brand Logo matching Acure Style */}
        <button
          onClick={() => {
            setSelectedCategory(null);
            setSearchQuery('');
            closeProductDetail();
            setIsMobileMenuOpen(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex items-center gap-2 group cursor-pointer focus:outline-hidden"
        >
          {/* Logo Box with letter T */}
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#EBF6ED] border border-[#A3D9A5] flex items-center justify-center text-[#185824] font-black text-xl sm:text-2xl group-hover:scale-105 transition-transform shadow-2xs">
            T
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xl sm:text-2xl font-black tracking-tight text-[#185824] font-sans">
              Tuktak <span className="text-[#E5A016]">Shopping</span>
            </span>
          </div>
        </button>

        {/* Desktop Search Bar */}
        <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-md items-center relative mx-4">
          <div className="w-full relative flex items-center">
            <input
              id="header-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products, spices, nuts..."
              className="w-full pl-4 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-full text-xs sm:text-sm text-gray-800 placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-[#278838] focus:bg-white transition-all"
            />
            <button
              type="submit"
              className="absolute right-1 p-1.5 text-gray-500 hover:text-[#185824] cursor-pointer"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Right Action Icons: Track, User, Admin & Cart with Yellow Badge */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Track Order */}
          <button
            onClick={() => openTrackOrder()}
            className="hidden lg:flex items-center gap-1 text-xs font-semibold text-gray-700 hover:text-[#185824] py-1.5 px-2.5 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer"
          >
            <PackageCheck className="w-4 h-4 text-[#185824]" />
            <span>Track</span>
          </button>

          {/* Admin Dashboard Pill */}
          {isAdmin && (
            <button
              onClick={openAdminDashboard}
              className="hidden sm:flex items-center gap-1.5 bg-[#165020] hover:bg-[#12431C] text-white text-xs font-bold py-1.5 px-3 rounded-full shadow-xs transition-all cursor-pointer"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-[#E5A016]" />
              <span className="hidden xl:inline">Admin</span>
            </button>
          )}

          {/* User Menu */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 p-1.5 sm:py-1.5 sm:px-2.5 rounded-full border border-emerald-200 transition-colors cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full bg-[#185824] text-white flex items-center justify-center text-[10px] font-bold">
                  {user.full_name.charAt(0).toUpperCase()}
                </div>
                <ChevronDown className="hidden sm:block w-3 h-3 text-gray-500" />
              </button>

              {isUserMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 text-xs font-medium space-y-1">
                    <div className="px-3.5 py-2 border-b border-gray-100">
                      <p className="font-bold text-gray-900 truncate">{user.full_name}</p>
                      <p className="text-[11px] text-gray-500 truncate">{user.email}</p>
                    </div>

                    {isAdmin && (
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          openAdminDashboard();
                        }}
                        className="w-full text-left px-3.5 py-2 text-gray-800 hover:bg-emerald-50 hover:text-[#185824] flex items-center gap-2 cursor-pointer font-bold"
                      >
                        <LayoutDashboard className="w-4 h-4 text-[#185824]" />
                        <span>Admin Dashboard</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-3.5 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer font-medium"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={openAuthModal}
              className="hidden sm:flex items-center text-xs font-bold text-[#185824] hover:bg-emerald-50 py-1.5 px-3 rounded-full transition-colors cursor-pointer"
            >
              Login
            </button>
          )}

          {/* Rightmost: Cart Icon with Golden-Yellow Badge (Screenshot 1 Match) */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative p-2 text-[#185824] hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer focus:outline-hidden"
            aria-label="Shopping Cart"
          >
            <ShoppingCart className="w-6 h-6 stroke-[2.2]" />
            {cartCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 bg-[#E5A016] text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-xs animate-pulse-subtle">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 3. Mobile Search Field (Visible on mobile right beneath header) */}
      <div className="md:hidden px-4 pb-2.5">
        <form onSubmit={handleSearchSubmit} className="relative flex items-center">
          <input
            id="mobile-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-4 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-full text-xs text-gray-800 placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-[#278838] focus:bg-white"
          />
          <button
            type="submit"
            className="absolute right-2 p-1 text-gray-500 hover:text-[#185824] cursor-pointer"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* 4. Desktop Sub-Navigation Bar in Forest Green */}
      <div className="hidden md:block bg-[#185824] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 py-2">
          {/* Category Dropdown */}
          <div className="relative shrink-0">
            <button
              onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold transition-all text-xs cursor-pointer shadow-xs whitespace-nowrap bg-white/10 hover:bg-white/20 text-white"
            >
              <Menu className="w-3.5 h-3.5" />
              <span>All Categories</span>
              <ChevronDown className="w-3 h-3 ml-0.5" />
            </button>

            {isCategoryDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsCategoryDropdownOpen(false)} />
                <div className="absolute left-0 top-full mt-2 w-64 max-h-[65vh] overflow-y-auto bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 text-gray-800">
                  <button
                    onClick={() => {
                      setSelectedCategory(null);
                      setIsCategoryDropdownOpen(false);
                      closeProductDetail();
                      scrollToProducts();
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-emerald-50 hover:text-[#185824] transition-colors flex items-center justify-between"
                  >
                    <span>All Products</span>
                    <span className="text-[10px] text-gray-400">সবগুলো</span>
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategory(cat.slug);
                        setIsCategoryDropdownOpen(false);
                        closeProductDetail();
                        scrollToProducts();
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs font-medium hover:bg-emerald-50 hover:text-[#185824] transition-colors flex items-center justify-between gap-2"
                    >
                      <span>{cat.name}</span>
                      <span className="text-[10px] text-gray-400 font-sans">{cat.name_bn}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Category Pills Bar */}
          <div className={`flex-1 min-w-0 flex items-center gap-2 overflow-x-auto text-xs font-semibold ${hideScrollbar}`}>
            {navCategories.map((item, idx) => {
              const isActive = selectedCategory === item.slug;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedCategory(item.slug);
                    closeProductDetail();
                    scrollToProducts();
                  }}
                  className={`shrink-0 px-3 py-1 rounded-full transition-colors whitespace-nowrap cursor-pointer text-xs font-semibold ${
                    isActive ? 'bg-white text-[#185824] font-bold shadow-xs' : 'hover:bg-white/15 text-white/90'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Hotline / Support */}
          <div className="hidden lg:flex shrink-0 items-center gap-1.5 text-white text-xs font-bold">
            <Phone className="w-3.5 h-3.5 text-[#E5A016]" />
            <a href={`tel:${settings.call_number || '01717823525'}`} className="hover:underline">
              {settings.call_number || '01717823525'}
            </a>
          </div>
        </div>
      </div>

      {/* 5. Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3 space-y-2 text-sm max-h-[70vh] overflow-y-auto shadow-md">
          <button
            onClick={() => {
              openTrackOrder();
              setIsMobileMenuOpen(false);
            }}
            className="w-full flex items-center gap-2 py-2.5 px-3 text-gray-700 hover:bg-emerald-50 hover:text-[#185824] rounded-lg text-left font-medium"
          >
            <PackageCheck className="w-4 h-4 text-[#185824]" />
            <span>Track Order (অর্ডার ট্র্যাক করুন)</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => {
                openAdminDashboard();
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 py-2.5 px-3 text-gray-700 hover:bg-emerald-50 hover:text-[#185824] rounded-lg text-left text-xs font-semibold"
            >
              <LayoutDashboard className="w-4 h-4 text-[#185824]" />
              <span>Admin Portal (ড্যাশবোর্ড)</span>
            </button>
          )}

          <div className="pt-2 border-t border-gray-100">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block px-3 mb-1">
              Shop Categories
            </span>
            <button
              onClick={() => {
                setSelectedCategory(null);
                setIsMobileMenuOpen(false);
                closeProductDetail();
                scrollToProducts();
              }}
              className="w-full text-left py-2 px-3 text-xs text-gray-800 font-bold hover:text-[#185824] hover:bg-emerald-50 rounded-md"
            >
              All Products (সবগুলো)
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.slug);
                  setIsMobileMenuOpen(false);
                  closeProductDetail();
                  scrollToProducts();
                }}
                className="w-full text-left py-2 px-3 text-xs text-gray-700 hover:text-[#185824] hover:bg-emerald-50 rounded-md flex justify-between gap-2"
              >
                <span>{cat.name}</span>
                <span className="text-gray-400 font-sans">{cat.name_bn}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};
