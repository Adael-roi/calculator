import { test, expect } from '@playwright/test';

test.describe('Calculator Basic Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.app-root', { state: 'visible' });
  });

  test('should load the calculator UI', async ({ page }) => {
    await expect(page.locator('.display')).toBeVisible();
    await expect(page.locator('.keypad')).toBeVisible();
    await expect(page.locator('.mode-btn')).toBeVisible();
    await expect(page.locator('.result-line')).toHaveText('0');
  });

  test('should perform basic addition', async ({ page }) => {
    // Click 1 + 2 =
    await page.click('text=1');
    await page.click('text=+');
    await page.click('text=2');
    await page.click('text==');

    // Wait for result
    await page.waitForTimeout(500);
    const result = await page.locator('.result-line').textContent();
    expect(result?.trim()).toBe('3');
  });

  test('should perform basic multiplication', async ({ page }) => {
    // Click 5 × 4 =
    await page.click('text=5');
    await page.click('text=×');
    await page.click('text=4');
    await page.click('text==');

    await page.waitForTimeout(500);
    const result = await page.locator('.result-line').textContent();
    expect(result?.trim()).toBe('20');
  });

  test('should handle decimal calculations', async ({ page }) => {
    // Click 3.5 + 2.5 =
    await page.click('text=3');
    await page.click('text=.');
    await page.click('text=5');
    await page.click('text=+');
    await page.click('text=2');
    await page.click('text=.');
    await page.click('text=5');
    await page.click('text==');

    await page.waitForTimeout(500);
    const result = await page.locator('.result-line').textContent();
    expect(result?.trim()).toBe('6');
  });

  test('should handle parentheses', async ({ page }) => {
    // Click (1 + 2) × 3 =
    await page.click('text=(');
    await page.click('text=1');
    await page.click('text=+');
    await page.click('text=2');
    await page.click('text=)');
    await page.click('text=×');
    await page.click('text=3');
    await page.click('text==');

    await page.waitForTimeout(500);
    const result = await page.locator('.result-line').textContent();
    expect(result?.trim()).toBe('9');
  });

  test('should handle exponentiation', async ({ page }) => {
    // Click 2 ^ 3 =
    await page.click('text=2');
    await page.click('text=^');
    await page.click('text=3');
    await page.click('text==');

    await page.waitForTimeout(500);
    const result = await page.locator('.result-line').textContent();
    expect(result?.trim()).toBe('8');
  });

  test('should handle square root', async ({ page }) => {
    // Click √ 16 ) =
    await page.click('text=√');
    await page.click('text=1');
    await page.click('text=6');
    await page.click('text=)');
    await page.click('text==');

    await page.waitForTimeout(500);
    const result = await page.locator('.result-line').textContent();
    expect(result?.trim()).toBe('4');
  });

  test('should handle trig functions in radians', async ({ page }) => {
    // Verify mode is RAD
    await expect(page.locator('.mode-btn')).toHaveText('RAD');

    // Click sin π ÷ 2 ) =
    await page.click('text=sin');
    await page.click('text=π');
    await page.click('text=÷');
    await page.click('text=2');
    await page.click('text=)');
    await page.click('text==');

    await page.waitForTimeout(500);
    const result = await page.locator('.result-line').textContent();
    // sin(π/2) should be 1
    expect(parseFloat(result || '0')).toBeCloseTo(1, 5);
  });

  test('should toggle angle mode and handle degrees', async ({ page }) => {
    // Toggle to DEG
    await page.click('.mode-btn');
    await expect(page.locator('.mode-btn')).toHaveText('DEG');

    // Click sin 9 0 ) =
    await page.click('text=sin');
    await page.click('text=9');
    await page.click('text=0');
    await page.click('text=)');
    await page.click('text==');

    await page.waitForTimeout(500);
    const result = await page.locator('.result-line').textContent();
    // sin(90°) should be 1
    expect(parseFloat(result || '0')).toBeCloseTo(1, 5);
  });

  test('should handle AC (clear all)', async ({ page }) => {
    // Enter some numbers
    await page.click('text=1');
    await page.click('text=2');
    await page.click('text=3');
    
    // Verify expression is shown
    await expect(page.locator('.expr-line')).toHaveText('123');

    // Click AC
    await page.click('text=AC');

    // Verify cleared
    await expect(page.locator('.expr-line')).toHaveText('');
    await expect(page.locator('.result-line')).toHaveText('0');
  });

  test('should handle DEL (backspace)', async ({ page }) => {
    // Enter some numbers
    await page.click('text=1');
    await page.click('text=2');
    await page.click('text=3');
    
    await expect(page.locator('.expr-line')).toHaveText('123');

    // Click DEL
    await page.click('text=DEL');

    // Verify last char deleted
    await expect(page.locator('.expr-line')).toHaveText('12');
  });

  test('should handle keyboard input', async ({ page }) => {
    // Type on keyboard
    await page.keyboard.type('5+3');
    await expect(page.locator('.expr-line')).toHaveText('5+3');

    // Press Enter
    await page.keyboard.press('Enter');

    await page.waitForTimeout(500);
    const result = await page.locator('.result-line').textContent();
    expect(result?.trim()).toBe('8');
  });

  test('should handle Escape key to clear', async ({ page }) => {
    await page.keyboard.type('123');
    await expect(page.locator('.expr-line')).toHaveText('123');

    await page.keyboard.press('Escape');
    await expect(page.locator('.expr-line')).toHaveText('');
    await expect(page.locator('.result-line')).toHaveText('0');
  });

  test('should handle Backspace key', async ({ page }) => {
    await page.keyboard.type('456');
    await expect(page.locator('.expr-line')).toHaveText('456');

    await page.keyboard.press('Backspace');
    await expect(page.locator('.expr-line')).toHaveText('45');
  });

  test('should show error for invalid expression', async ({ page }) => {
    // Enter invalid expression
    await page.keyboard.type('5++3');
    await page.keyboard.press('Enter');

    await page.waitForTimeout(500);
    const result = await page.locator('.result-line').textContent();
    expect(result).toContain('Error');
  });

  test('should handle constants π and e', async ({ page }) => {
    // Click π =
    await page.click('text=π');
    await page.click('text==');

    await page.waitForTimeout(500);
    const piResult = await page.locator('.result-line').textContent();
    expect(parseFloat(piResult || '0')).toBeCloseTo(Math.PI, 5);

    // Clear and test e
    await page.click('text=AC');
    await page.click('text=e');
    await page.click('text==');

    await page.waitForTimeout(500);
    const eResult = await page.locator('.result-line').textContent();
    expect(parseFloat(eResult || '0')).toBeCloseTo(Math.E, 5);
  });
});
