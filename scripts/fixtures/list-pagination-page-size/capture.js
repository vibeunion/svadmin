export default async(page)=>{
  const phase='__PHASE__',results=[],errors=[],warnings=[],failed=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='warning'||message.type()==='error')warnings.push(message.text());});
  page.on('requestfailed',request=>failed.push(request.url()));
  for(const viewport of [{width:1440,height:900},{width:1920,height:1080}]){
    await page.setViewportSize(viewport);await page.goto('http://127.0.0.1:5289/');
    const main=page.getByTestId('main-pagination');await main.waitFor();
    await page.evaluate(async()=>{await document.fonts.ready;await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);});
    const beforeRows=await page.locator('tbody tr').count();if(beforeRows!==10)throw Error('Initial rows mismatch');
    const selector=main.getByRole('combobox',{name:'Records每页条数',exact:true});await selector.focus();await selector.selectOption('50');
    await page.waitForFunction(()=>document.querySelectorAll('tbody tr').length===23);
    const single={rows:await page.locator('tbody tr').count(),selectors:await selector.count(),navigation:await main.getByRole('navigation').count(),pageButtons:await main.getByRole('button').count(),footerSelectors:await page.getByRole('combobox',{name:'Footer records每页条数',exact:true}).count(),overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),focusedSelect:await page.evaluate(()=>document.activeElement?.tagName==='SELECT')};
    if(single.navigation||single.pageButtons||single.overflow||single.selectors!==(phase==='after'?1:0))throw Error(JSON.stringify(single));
    await page.screenshot({path:`docs/pr-evidence/list-pagination-page-size/${phase}-${viewport.width}.png`});
    if(phase==='after'){
      if(!single.focusedSelect||single.footerSelectors!==1)throw Error('Selector focus/footer missing');
      await selector.selectOption('10');await page.waitForFunction(()=>document.querySelectorAll('tbody tr').length===10);if(await main.getByRole('navigation').count()!==1)throw Error('Cannot restore multiple pages');
      await page.getByLabel('显示汇总文字',{exact:true}).uncheck();if(await selector.count()!==1||await main.getByText(/第.*条.*共/).count())throw Error('Summary hides selector');
      await page.getByLabel('空结果',{exact:true}).check();await page.waitForFunction(()=>document.querySelectorAll('tbody tr').length===0);if(await selector.count()!==1||await main.getByRole('button').count()||await main.getByRole('navigation').count())throw Error('Empty state loses control');
      await page.getByRole('combobox',{name:'Footer records每页条数',exact:true}).selectOption('10');const footer=page.locator('[data-svadmin-list-footer]');if(await footer.getByText('共 23 条',{exact:true}).count()!==1||await footer.getByRole('navigation').count()!==1)throw Error('Footer duplicate/missing pagination');
      await page.getByRole('button',{name:'切换语言',exact:true}).click();if(await main.getByRole('combobox',{name:'Records rows per page',exact:true}).count()!==1)throw Error('Single-page localization missing');
      await page.screenshot({path:`docs/pr-evidence/list-pagination-page-size/states-${viewport.width}.png`});
    }
    results.push({viewport,single,recoveryChecked:phase==='after'});
  }
  if(errors.length||warnings.length||failed.length)throw Error(JSON.stringify({errors,warnings,failed}));return{phase,results,errors,warnings,failed};
}
