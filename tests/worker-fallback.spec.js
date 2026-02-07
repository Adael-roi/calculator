import { test, expect } from '@playwright/test';

test.describe('Worker and Fallback Evaluation', () => {
  test('should use worker for evaluation when available', async ({ page }) => {
    // Listen for worker messages
    const workerMessages = [];
    page.on('console', msg => {
      if (msg.text().includes('Worker') || msg.text().includes('worker')) {
        workerMessages.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForSelector('.app-root', { state: 'visible' });

    // Perform calculation
    await page.keyboard.type('10+5');
    await page.keyboard.press('Enter');

    // Wait for result
    await page.waitForTimeout(1000);
    const result = await page.locator('.result-line').textContent();
    expect(result?.trim()).toBe('15');

    // Result should appear quickly (worker is working)
    // If it takes more than 1.5s, fallback would have kicked in
  });

  test('should handle worker timeout and use fallback', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.app-root', { state: 'visible' });

    // Intercept worker script to simulate worker not responding
    await page.route('**/calculatorWorker.js', route => {
      // Return empty/broken worker
      route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: '// Broken worker - does not respond',
      });
    });

    // Reload to get broken worker
    await page.reload();
    await page.waitForSelector('.app-root', { state: 'visible' });

    // Perform calculation - should fallback to local evaluation
    await page.keyboard.type('7+8');
    await page.keyboard.press('Enter');

    // Wait for fallback timeout (1.5s) + processing time
    await page.waitForTimeout(2000);

    const result = await page.locator('.result-line').textContent();
    // Fallback should still compute correct result
    expect(result?.trim()).toBe('15');
  });

  test('should handle worker load failure gracefully', async ({ page }) => {
    // Block worker script entirely
    await page.route('**/calculatorWorker.js', route => {
      route.abort('failed');
    });

    await page.goto('/');
    await page.waitForSelector('.app-root', { state: 'visible' });

    // Perform calculation - should immediately use fallback
    await page.keyboard.type('3*4');
    await page.keyboard.press('Enter');

    // Fallback should work immediately when worker fails to load
    await page.waitForTimeout(2000);

    const result = await page.locator('.result-line').textContent();
    expect(result?.trim()).toBe('12');
  });

  test('should handle worker crash mid-calculation', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.app-root', { state: 'visible' });

    // First calculation should work
    await page.keyboard.type('5+5');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    
    let result = await page.locator('.result-line').textContent();
    expect(result?.trim()).toBe('10');

    // Now simulate worker becoming unresponsive
    await page.evaluate(() => {
      // Terminate the worker in the page context
      if (window.worker) {
        window.worker.terminate();
      }
    });

    // Try another calculation - should use fallback
    await page.keyboard.type('20-8');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);

    result = await page.locator('.result-line').textContent();
    expect(result?.trim()).toBe('12');
  });

  test('should handle complex calculation in both modes', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.app-root', { state: 'visible' });

    // Complex expression: (5+3)^2 - sqrt(16)
    await page.keyboard.type('(5+3)^2-sqrt(16)');
    await page.keyboard.press('Enter');

    await page.waitForTimeout(1000);
    const result = await page.locator('.result-line').textContent();
    // (8)^2 - 4 = 64 - 4 = 60
    expect(result?.trim()).toBe('60');
  });

  test('should verify worker response time is faster than fallback timeout', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.app-root', { state: 'visible' });

    const startTime = Date.now();

    await page.keyboard.type('123+456');
    await page.keyboard.press('Enter');

    // Wait for result to appear (not for full timeout)
    await page.waitForFunction(() => {
      const result = document.querySelector('.result-line')?.textContent;
      return result !== '…' && result !== '0' && result !== '';
    }, { timeout: 1000 });

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Worker should respond within 1000ms (faster than 1500ms fallback timeout)
    expect(duration).toBeLessThan(1500);

    const result = await page.locator('.result-line').textContent();
    expect(result?.trim()).toBe('579');
  });

  test('should handle multiple rapid calculations', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.app-root', { state: 'visible' });

    // Perform multiple calculations in quick succession
    const calculations = [
      { expr: '1+1', expected: '2' },
      { expr: '2*2', expected: '4' },
      { expr: '10-3', expected: '7' },
      { expr: '20/4', expected: '5' },
    ];

    for (const calc of calculations) {
      await page.keyboard.type(calc.expr);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(800);
      
      const result = await page.locator('.result-line').textContent();
      expect(result?.trim()).toBe(calc.expected);
    }
  });

  test('should maintain angle mode across worker calls', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.app-root', { state: 'visible' });

    // Switch to DEG mode
    await page.click('.mode-btn');
    await expect(page.locator('.mode-btn')).toHaveText('DEG');

    // Calculate sin(30) in degrees
    await page.keyboard.type('sin(30)');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    const result = await page.locator('.result-line').textContent();
    // sin(30°) = 0.5
    expect(parseFloat(result || '0')).toBeCloseTo(0.5, 5);
  });
});
