/* eslint-disable prefer-arrow-callback */
/* eslint-disable func-names */

import { assert } from 'chai';
import path from 'path';
import { By } from 'selenium-webdriver';
import { fileURLToPath } from 'url';
import { createDriver } from '../scripts/helpers.js';

globalThis.__dirname = path.dirname(fileURLToPath(import.meta.url));
const port = 3031;

/**
 * Check whether the proofread mode alert inside #alertDownloadDiv is visible.
 * Uses `isDisplayed()` which accounts for all CSS visibility rules.
 * @param {import('selenium-webdriver').WebDriver} driver
 * @returns {Promise<boolean>}
 */
async function isAlertVisible(driver) {
  const alertDiv = await driver.findElement(By.id('alertDownloadDiv'));
  const children = await alertDiv.findElements(By.css('.alert'));
  if (children.length === 0) return false;
  return children[0].isDisplayed();
}

describe('PDF proofread mode alert', function () {
  let driver;
  this.timeout(30000);
  const appURL = process.env.SELENIUM ? `http://172.18.0.2:${port}/` : `http://localhost:${port}/`;

  before(async function () {
    ({ driver } = await createDriver());
  });

  it('shows alert when Download tab opened in Proofread Mode with PDF selected', async function () {
    await driver.get(appURL);

    // Open the Download tab (default format is .pdf, default display mode is Proofread)
    await driver.findElement(By.id('nav-download-tab')).click();

    // Wait for the collapse animation to complete
    await driver.sleep(500);

    // The alert should be visible
    const visible = await isAlertVisible(driver);
    assert.isTrue(visible, 'Alert should be visible in Proofread Mode with PDF format');
  });

  it('hides alert when display mode is switched to OCR Mode', async function () {
    // The displayMode select is in the View panel (not visible while Download tab is open),
    // so use JavaScript to change it and fire the change event.
    await driver.executeScript(`
      const select = document.getElementById('displayMode');
      select.value = 'invis';
      select.dispatchEvent(new Event('change'));
    `);

    const visible = await isAlertVisible(driver);
    assert.isFalse(visible, 'Alert should be hidden in OCR Mode');
  });

  it('shows alert again when switching back to Proofread Mode', async function () {
    await driver.executeScript(`
      const select = document.getElementById('displayMode');
      select.value = 'proof';
      select.dispatchEvent(new Event('change'));
    `);

    const visible = await isAlertVisible(driver);
    assert.isTrue(visible, 'Alert should be visible after switching back to Proofread Mode');
  });

  it('hides alert when format is changed to non-PDF', async function () {
    // Change format to HOCR
    await driver.findElement(By.id('downloadFormat')).click();
    await driver.findElement(By.id('formatLabelOptionHocr')).click();

    const visible = await isAlertVisible(driver);
    assert.isFalse(visible, 'Alert should be hidden for non-PDF formats');
  });

  afterEach(async function () {
    if (this.currentTest.state === 'failed') {
      const fs = await import('node:fs');
      const screenshotsDir = path.join(__dirname, 'screenshots');
      if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });
      const screenshotPath = path.join(screenshotsDir, `${this.currentTest.title}.png`);
      const image = await driver.takeScreenshot();
      fs.writeFileSync(screenshotPath, image, 'base64');
      console.log(`Screenshot saved to ${screenshotPath}`);
    }
  });

  after(async () => {
    await driver.quit();
  });
});
