import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const ARTIFACT_DIR = path.resolve('qa_screenshots');
if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

const TEST_TARGETS = [
  'KRK001', 'KRK002', 'KRK003', 'KRK004', 'KRK005', 'KRK006', // Square
  'KRK020', 'KRK021', 'KRK022', 'KRK023', 'KRK127',           // Wide
  'KRK117', 'KRK092', 'KRK121', 'KRK128',                     // Tall
  'KRK133', 'KRK134', 'KRK135', 'KRK136', 'KRK137', 'KRK138'  // Personalized
];

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 600;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          window.scrollTo(0, 0);
          resolve();
        }
      }, 50);
    });
  });
  // Wait a moment for any final render
  await new Promise(r => setTimeout(r, 500));
}

async function runVisualQA() {
  console.log(`[QA] Launching headless browser using: ${CHROME_PATH}`);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--window-size=1440,900']
  });

  const report = {
    timestamp: new Date().toISOString(),
    desktop: {},
    mobile: {},
    productDetails: {},
    personalizedGallery: {},
    failures: []
  };

  try {
    // -------------------------------------------------------------
    // 1. DESKTOP VIEWPORT TEST (1440 x 900)
    // -------------------------------------------------------------
    console.log('\n[QA] === RUNNING DESKTOP VIEWPORT AUDIT (1440x900) ===');
    const desktopPage = await browser.newPage();
    await desktopPage.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await desktopPage.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

    // Scroll through page to load all images
    await autoScroll(desktopPage);

    // Full homepage desktop screenshot
    const homeDesktopPath = path.join(ARTIFACT_DIR, '01_desktop_homepage.png');
    await desktopPage.screenshot({ path: homeDesktopPath, fullPage: true });
    console.log(`[QA] Saved full homepage desktop screenshot to ${homeDesktopPath}`);

    // Inspect rendered cards and images on homepage / catalogue
    const desktopMetrics = await desktopPage.evaluate((targets) => {
      const results = {};
      const allProductCards = Array.from(document.querySelectorAll('a[href^="/product/"]'));

      for (const card of allProductCards) {
        const href = card.getAttribute('href') || '';
        const idMatch = href.match(/\/product\/(KRK\d+)/);
        if (!idMatch) continue;
        const id = idMatch[1];
        if (!targets.includes(id)) continue;
        if (results[id]) continue; // Take first occurrence

        const img = card.querySelector('img');
        const cardRect = card.getBoundingClientRect();
        const imgRect = img ? img.getBoundingClientRect() : null;
        const computedImg = img ? window.getComputedStyle(img) : null;
        const cardParent = card.parentElement;
        const parentRect = cardParent ? cardParent.getBoundingClientRect() : null;

        results[id] = {
          id,
          cardWidth: Math.round(cardRect.width),
          cardHeight: Math.round(cardRect.height),
          cardAspectRatio: Number((cardRect.width / cardRect.height).toFixed(2)),
          imgWidth: imgRect ? Math.round(imgRect.width) : 0,
          imgHeight: imgRect ? Math.round(imgRect.height) : 0,
          imgRenderedAspectRatio: imgRect && imgRect.height > 0 ? Number((imgRect.width / imgRect.height).toFixed(2)) : 0,
          naturalWidth: img ? img.naturalWidth : 0,
          naturalHeight: img ? img.naturalHeight : 0,
          naturalAspectRatio: img && img.naturalHeight > 0 ? Number((img.naturalWidth / img.naturalHeight).toFixed(2)) : 0,
          objectFit: computedImg ? computedImg.objectFit : null,
          hasObjectCover: computedImg ? computedImg.objectFit === 'cover' : false,
        };
      }
      return results;
    }, TEST_TARGETS);

    report.desktop = desktopMetrics;

    // -------------------------------------------------------------
    // 2. MOBILE VIEWPORT TEST (390 x 844)
    // -------------------------------------------------------------
    console.log('\n[QA] === RUNNING MOBILE VIEWPORT AUDIT (390x844) ===');
    const mobilePage = await browser.newPage();
    await mobilePage.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await mobilePage.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

    // Scroll through page to load all images on mobile
    await autoScroll(mobilePage);

    const homeMobilePath = path.join(ARTIFACT_DIR, '02_mobile_homepage.png');
    await mobilePage.screenshot({ path: homeMobilePath, fullPage: true });
    console.log(`[QA] Saved full homepage mobile screenshot to ${homeMobilePath}`);

    const mobileMetrics = await mobilePage.evaluate((targets) => {
      const results = {};
      const allProductCards = Array.from(document.querySelectorAll('a[href^="/product/"]'));

      for (const card of allProductCards) {
        const href = card.getAttribute('href') || '';
        const idMatch = href.match(/\/product\/(KRK\d+)/);
        if (!idMatch) continue;
        const id = idMatch[1];
        if (!targets.includes(id)) continue;
        if (results[id]) continue;

        const img = card.querySelector('img');
        const cardRect = card.getBoundingClientRect();
        const imgRect = img ? img.getBoundingClientRect() : null;
        const computedImg = img ? window.getComputedStyle(img) : null;

        results[id] = {
          id,
          cardWidth: Math.round(cardRect.width),
          cardHeight: Math.round(cardRect.height),
          cardAspectRatio: Number((cardRect.width / cardRect.height).toFixed(2)),
          imgWidth: imgRect ? Math.round(imgRect.width) : 0,
          imgHeight: imgRect ? Math.round(imgRect.height) : 0,
          imgRenderedAspectRatio: imgRect && imgRect.height > 0 ? Number((imgRect.width / imgRect.height).toFixed(2)) : 0,
          naturalWidth: img ? img.naturalWidth : 0,
          naturalHeight: img ? img.naturalHeight : 0,
          naturalAspectRatio: img && img.naturalHeight > 0 ? Number((img.naturalWidth / img.naturalHeight).toFixed(2)) : 0,
          objectFit: computedImg ? computedImg.objectFit : null,
          hasObjectCover: computedImg ? computedImg.objectFit === 'cover' : false,
        };
      }
      return results;
    }, TEST_TARGETS);

    report.mobile = mobileMetrics;

    // -------------------------------------------------------------
    // 3. PRODUCT DETAIL PAGES (Tall vs Wide vs Square)
    // -------------------------------------------------------------
    console.log('\n[QA] === INSPECTING INDIVIDUAL PRODUCT DETAIL PAGES ===');
    const representativeProducts = ['KRK117', 'KRK020', 'KRK001', 'KRK127', 'KRK092'];
    for (const pid of representativeProducts) {
      const pPage = await browser.newPage();
      await pPage.setViewport({ width: 1440, height: 900 });
      await pPage.goto(`http://localhost:3000/product/${pid}`, { waitUntil: 'networkidle2' });

      const detailScreenshot = path.join(ARTIFACT_DIR, `03_detail_${pid}_desktop.png`);
      await pPage.screenshot({ path: detailScreenshot });

      // Mobile detail
      await pPage.setViewport({ width: 390, height: 844, isMobile: true });
      const detailMobileScreenshot = path.join(ARTIFACT_DIR, `04_detail_${pid}_mobile.png`);
      await pPage.screenshot({ path: detailMobileScreenshot });

      const detailMetrics = await pPage.evaluate(() => {
        const img = document.querySelector('img[alt]');
        if (!img) return null;
        const rect = img.getBoundingClientRect();
        const computed = window.getComputedStyle(img);
        return {
          imgWidth: Math.round(rect.width),
          imgHeight: Math.round(rect.height),
          imgRenderedAR: Number((rect.width / rect.height).toFixed(2)),
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          naturalAR: Number((img.naturalWidth / img.naturalHeight).toFixed(2)),
          objectFit: computed.objectFit,
          maxHeight: computed.maxHeight
        };
      });

      report.productDetails[pid] = detailMetrics;
      await pPage.close();
    }

    // -------------------------------------------------------------
    // 4. PERSONALIZED REFERENCE GALLERY & WORKBENCH (/module/personalized)
    // -------------------------------------------------------------
    console.log('\n[QA] === INSPECTING PERSONALIZED MODULE & REFERENCE GALLERY ===');
    const persPage = await browser.newPage();
    await persPage.setViewport({ width: 1440, height: 900 });
    await persPage.goto('http://localhost:3000/module/personalized', { waitUntil: 'networkidle2' });

    const persDesktopPath = path.join(ARTIFACT_DIR, '05_personalized_desktop.png');
    await persPage.screenshot({ path: persDesktopPath, fullPage: true });

    await persPage.setViewport({ width: 390, height: 844, isMobile: true });
    const persMobilePath = path.join(ARTIFACT_DIR, '06_personalized_mobile.png');
    await persPage.screenshot({ path: persMobilePath, fullPage: true });

    const persMetrics = await persPage.evaluate(() => {
      const showcaseImg = document.querySelector('img[alt*="Example"]') || document.querySelector('img[alt*="REFERENCE"]') || document.querySelector('.border img');
      if (!showcaseImg) return null;
      const rect = showcaseImg.getBoundingClientRect();
      const comp = window.getComputedStyle(showcaseImg);
      return {
        showcaseWidth: Math.round(rect.width),
        showcaseHeight: Math.round(rect.height),
        objectFit: comp.objectFit,
        naturalWidth: showcaseImg.naturalWidth,
        naturalHeight: showcaseImg.naturalHeight,
      };
    });
    report.personalizedGallery = persMetrics;
    await persPage.close();

    await desktopPage.close();
    await mobilePage.close();

  } catch (err) {
    console.error('[QA] Error during Visual QA run:', err);
    report.error = err.message;
  } finally {
    await browser.close();
  }

  // Save full JSON report
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'visual_qa_report.json'), JSON.stringify(report, null, 2));
  console.log(`\n[QA] Visual QA Complete! Full report written to ${path.join(ARTIFACT_DIR, 'visual_qa_report.json')}`);
}

runVisualQA();
