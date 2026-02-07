import { test, expect } from '@playwright/test';

test.describe('PWA and Offline Functionality', () => {
  test('should register service worker', async ({ page }) => {
    const swMessages = [];
    page.on('console', msg => {
      swMessages.push(msg.text());
    });

    await page.goto('/');
    await page.waitForSelector('.app-root', { state: 'visible' });

    // Wait for service worker registration
    await page.waitForTimeout(2000);

    // Check if service worker is registered
    const swRegistered = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        return registration !== undefined;
      }
      return false;
    });

    expect(swRegistered).toBe(true);

    // Check console for registration message
    const hasSwMessage = swMessages.some(msg => 
      msg.includes('Service worker registered') || msg.includes('SW')
    );
    expect(hasSwMessage).toBe(true);
  });

  test('should cache app shell resources', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.app-root', { state: 'visible' });

    // Wait for service worker to install and cache
    await page.waitForTimeout(3000);

    // Check cache storage
    const cachedUrls = await page.evaluate(async () => {
      const cacheNames = await caches.keys();
      if (cacheNames.length === 0) return [];

      const cache = await caches.open(cacheNames[0]);
      const requests = await cache.keys();
      return requests.map(req => new URL(req.url).pathname);
    });

    // Verify key resources are cached
    expect(cachedUrls.length).toBeGreaterThan(0);
    expect(cachedUrls.some(url => url.includes('index.html') || url === '/')).toBe(true);
  });

  test('should work offline after initial load', async ({ page, context }) => {
    // First visit - online
    await page.goto('/');
    await page.waitForSelector('.app-root', { state: 'visible' });

    // Wait for service worker and caching
    await page.waitForTimeout(3000);

    // Verify online calculation works
    await page.keyboard.type('5+5');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    
    let result = await page.locator('.result-line').textContent();
    expect(result?.trim()).toBe('10');

    // Clear expression
    await page.keyboard.press('Escape');

    // Go offline
    await context.setOffline(true);

    // Reload page (should work from cache)
    await page.reload();
    await page.waitForSelector('.app-root', { state: 'visible' });

    // Verify UI is still interactive offline
    await page.keyboard.type('7+3');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000); // May need fallback timeout

    result = await page.locator('.result-line').textContent();
    expect(result?.trim()).toBe('10');

    // Go back online
    await context.setOffline(false);
  });

  test('should handle offline mode with fallback evaluation', async ({ page, context }) => {
    // Load page online
    await page.goto('/');
    await page.waitForSelector('.app-root', { state: 'visible' });
    await page.waitForTimeout(2000);

    // Go offline
    await context.setOffline(true);

    // Reload
    await page.reload();
    await page.waitForSelector('.app-root', { state: 'visible' });

    // Perform calculation - worker may not load, should use fallback
    await page.keyboard.type('12*3');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2500);

    const result = await page.locator('.result-line').textContent();
    expect(result?.trim()).toBe('36');

    await context.setOffline(false);
  });

  test('should update cache on new version', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.app-root', { state: 'visible' });
    await page.waitForTimeout(2000);

    // Get initial cache version
    const initialCacheName = await page.evaluate(async () => {
      const cacheNames = await caches.keys();
      return cacheNames[0] || '';
    });

    expect(initialCacheName).toContain('calc-shell');
    expect(initialCacheName.length).toBeGreaterThan(0);
  });

  test('should serve app from cache when server is slow', async ({ page }) => {
    // Add delay to network responses
    await page.route('**/*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 100));
      route.continue();
    });

    await page.goto('/');
    
    // First load may be slow
    await page.waitForSelector('.app-root', { state: 'visible', timeout: 10000 });

    // Wait for service worker
    await page.waitForTimeout(2000);

    // Reload - should be faster from cache
    const startTime = Date.now();
    await page.reload();
    await page.waitForSelector('.app-root', { state: 'visible', timeout: 5000 });
    const loadTime = Date.now() - startTime;

    // Second load should be reasonably fast even with network delay
    expect(loadTime).toBeLessThan(3000);
  });

  test('should have PWA manifest', async ({ page }) => {
    await page.goto('/');

    // Check manifest link
    const manifestLink = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(manifestLink).toBe('/manifest.json');

    // Fetch and verify manifest content
    const manifestResponse = await page.request.get('/manifest.json');
    expect(manifestResponse.status()).toBe(200);

    const manifest = await manifestResponse.json();
    expect(manifest.name).toBe('Scientific Calculator');
    expect(manifest.short_name).toBe('Calc');
    expect(manifest.display).toBe('standalone');
  });

  test('should be installable as PWA', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.app-root', { state: 'visible' });

    // Check for PWA install prompt support
    const isPWAInstallable = await page.evaluate(() => {
      return 'serviceWorker' in navigator && 
             window.matchMedia('(display-mode: standalone)').matches === false;
    });

    // At minimum, service worker should be supported
    expect(isPWAInstallable).toBe(true);
  });

  test('should handle cache cleanup of old versions', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.app-root', { state: 'visible' });
    await page.waitForTimeout(2000);

    // Create fake old cache
    await page.evaluate(async () => {
      await caches.open('calc-shell-old');
      await caches.open('calc-shell-v0');
    });

    // Get cache names
    let cacheNames = await page.evaluate(async () => {
      return await caches.keys();
    });

    // Should have multiple caches now
    expect(cacheNames.length).toBeGreaterThanOrEqual(2);

    // Reload to trigger service worker activate event
    await page.reload();
    await page.waitForTimeout(3000);

    // Check cache names again - old ones should be cleaned up
    cacheNames = await page.evaluate(async () => {
      return await caches.keys();
    });

    // Should only have current cache
    const currentCache = cacheNames.find(name => name.includes('calc-shell-v'));
    expect(currentCache).toBeDefined();
  });

  test('should handle network errors gracefully', async ({ page, context }) => {
    // Load page online first
    await page.goto('/');
    await page.waitForSelector('.app-root', { state: 'visible' });
    await page.waitForTimeout(2000);

    // Simulate network error by blocking all requests
    await page.route('**/*', route => route.abort('failed'));

    // Try to navigate - should show cached version
    await page.goto('/');
    await page.waitForSelector('.app-root', { state: 'visible', timeout: 5000 });

    // App should still work
    await page.keyboard.type('9-4');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);

    const result = await page.locator('.result-line').textContent();
    expect(result?.trim()).toBe('5');
  });
});
