/**
 * SPA Router Helper
 * Universal helper untuk menambahkan History API routing ke Single Page Applications
 * 
 * Usage:
 * 1. Include script ini di HTML: <script src="../spa-router-helper.js"></script>
 * 2. Initialize dengan config
 * 
 * @example
 * const router = new SPARouter({
 *   onNavigate: (route) => {
 *     // Handle navigation berdasarkan route
 *     if (route.view === 'detail') {
 *       showDetail(route.params.id);
 *     }
 *   }
 * });
 * 
 * // Saat navigasi, update URL
 * router.navigate('detail', { id: 123 });
 */

class SPARouter {
  constructor(config = {}) {
    this.config = {
      onNavigate: config.onNavigate || (() => {}),
      onBack: config.onBack || null,
      basePath: config.basePath || '',
      useHash: config.useHash !== false, // default true untuk static hosting
    };
    
    this.currentRoute = null;
    this.init();
  }

  /**
   * Initialize router dengan event listeners
   */
  init() {
    // Handle browser back/forward buttons
    window.addEventListener('popstate', (event) => {
      if (event.state) {
        this.currentRoute = event.state;
        this.config.onNavigate(event.state);
      } else {
        // Handle hash-based navigation untuk backward compatibility
        this.parseHashAndNavigate();
      }
    });

    // Handle initial page load
    window.addEventListener('DOMContentLoaded', () => {
      this.parseHashAndNavigate();
    });
  }

  /**
   * Parse hash dari URL dan navigate
   */
  parseHashAndNavigate() {
    if (!this.config.useHash) return;
    
    const hash = window.location.hash;
    if (!hash || hash === '#') return;

    // Parse hash format: #view/param1/param2
    const parts = hash.substring(1).split('/');
    const view = parts[0];
    const params = {};
    
    // Extract params dari URL
    if (parts.length > 1) {
      params.id = parts[1];
      for (let i = 2; i < parts.length; i++) {
        params[`param${i-1}`] = parts[i];
      }
    }

    this.currentRoute = { view, params };
    this.config.onNavigate(this.currentRoute);
  }

  /**
   * Navigate ke route baru dan update URL
   * 
   * @param {string} view - Nama view/halaman
   * @param {Object} params - Parameter tambahan (optional)
   * @param {Object} options - Options (optional)
   * @example
   * router.navigate('product', { id: 5 });
   * router.navigate('category', { category: 'electronics' }, { replace: true });
   */
  navigate(view, params = {}, options = {}) {
    const state = { view, params };
    this.currentRoute = state;

    // Build URL
    let url;
    if (this.config.useHash) {
      url = `#${view}`;
      if (Object.keys(params).length > 0) {
        const paramStr = Object.values(params).join('/');
        url += `/${paramStr}`;
      }
    } else {
      url = `${this.config.basePath}/${view}`;
      if (Object.keys(params).length > 0) {
        const queryStr = new URLSearchParams(params).toString();
        url += `?${queryStr}`;
      }
    }

    // Update history
    if (options.replace) {
      history.replaceState(state, '', url);
    } else {
      history.pushState(state, '', url);
    }

    // Trigger navigation callback
    this.config.onNavigate(state);
  }

  /**
   * Navigate ke home/root
   */
  navigateHome() {
    const state = { view: 'home', params: {} };
    this.currentRoute = state;
    
    const url = this.config.useHash ? window.location.pathname : this.config.basePath;
    history.pushState(state, '', url);
    this.config.onNavigate(state);
  }

  /**
   * Get current route
   * @returns {Object} Current route state
   */
  getCurrentRoute() {
    return this.currentRoute;
  }

  /**
   * Check if we're on specific route
   * @param {string} view - View name to check
   * @returns {boolean}
   */
  isCurrentRoute(view) {
    return this.currentRoute && this.currentRoute.view === view;
  }

  /**
   * Go back in history
   */
  back() {
    if (this.config.onBack) {
      this.config.onBack();
    }
    window.history.back();
  }

  /**
   * Go forward in history
   */
  forward() {
    window.history.forward();
  }
}

// Export untuk module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SPARouter;
}

/**
 * CONTOH PENGGUNAAN
 * 
 * // 1. Untuk aplikasi dengan kategori dan detail
 * const router = new SPARouter({
 *   onNavigate: (route) => {
 *     if (route.view === 'category') {
 *       showCategory(route.params.id);
 *     } else if (route.view === 'detail') {
 *       showDetail(route.params.id);
 *     } else {
 *       showHome();
 *     }
 *   }
 * });
 * 
 * // Saat user click kategori
 * function onCategoryClick(category) {
 *   router.navigate('category', { id: category });
 * }
 * 
 * // Saat user click detail
 * function onDetailClick(id) {
 *   router.navigate('detail', { id: id });
 * }
 * 
 * // 2. Untuk aplikasi chat
 * const chatRouter = new SPARouter({
 *   onNavigate: (route) => {
 *     if (route.view === 'chat') {
 *       openChatRoom(route.params.id);
 *     } else if (route.view === 'profile') {
 *       showProfile(route.params.id);
 *     } else {
 *       showChatList();
 *     }
 *   }
 * });
 * 
 * // Saat buka chat room
 * function openChat(chatId) {
 *   chatRouter.navigate('chat', { id: chatId });
 * }
 */
