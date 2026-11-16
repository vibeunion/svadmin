export default async function verifyCursorController(page) {
  const results=[];
  for(const viewport of [{width:1440,height:900},{width:1920,height:1080}]) {
    await page.setViewportSize(viewport);
    await page.goto('http://127.0.0.1:5286/docs/pr-evidence/cursor-list-controller/fixture.html');
    const ready=()=>page.waitForFunction(()=>document.body.dataset.loading==='false');
    const rows=()=>page.locator('#rows tr').allTextContents();
    await ready();const first=await rows();
    await page.locator('#next').press('Enter');await ready();const second=await rows();
    if(second.length!==2||second.some(r=>first.includes(r)))throw Error('Page replacement failed');
    await page.locator('#fail').click();await ready();
    if(await page.locator('#page').innerText()!=='Page 2'||JSON.stringify(await rows())!==JSON.stringify(second))throw Error('Failure lost current page');
    await page.locator('#next').press('Enter');await ready();
    if((await rows()).length!==1||!await page.locator('#next').isDisabled()||await page.locator('#previous').isDisabled())throw Error('Last page boundary');
    await page.locator('#previous').click();await ready();
    if(JSON.stringify(await rows())!==JSON.stringify(second))throw Error('Previous page');
    await page.locator('#closed').click();await ready();
    if(await page.locator('#page').innerText()!=='Page 1'||!await page.locator('#previous').isDisabled()||!await page.locator('#next').isDisabled())throw Error('Query reset');
    results.push({viewport,first,second});
  }
  return results;
}
