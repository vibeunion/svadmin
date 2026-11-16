async(page) => {
  const results=[];
  for (const viewport of [{width:1440,height:900},{width:1920,height:1080}]) {
    await page.setViewportSize(viewport);
    await page.goto('http://127.0.0.1:5286/docs/pr-evidence/alert-grid-layout/fixture.html');
    await page.locator('.svadmin-alert').first().waitFor();
    for (const expanded of [false,true]) {
      if(expanded)await page.getByText('Technical details',{exact:true}).press('Enter');
      const facts=await page.locator('.svadmin-alert').evaluateAll(nodes=>nodes.map(n=>{
        const rect=n.getBoundingClientRect();return {textOffset:n.querySelector('h5').getBoundingClientRect().left-rect.left,overflow:n.scrollWidth>n.clientWidth+1};
      }));
      if(facts[0].textOffset!==45||facts[1].textOffset!==17||facts.some(f=>f.overflow))throw Error(JSON.stringify(facts));
      if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('Page overflow');
      results.push({viewport,expanded,facts});
    }
  }
  return results;
}
