async (page) => {
  const checks = [];
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  for (const direction of ['ltr', 'rtl']) for (const width of [390, 767, 768, 1440, 1920]) for (const prefix of ['svadmin-sidebar-content', 'sidebar-content']) for (const state of ['expanded', 'collapsed']) {
    await page.setViewportSize({ width, height: 1080 });
    await page.evaluate(({direction,prefix,state}) => {document.documentElement.dir=direction; document.querySelector('#content').className=`${prefix}-${state} transition-all`; document.querySelector('#sidebar').className=`svadmin-sidebar-${state}`;}, {direction,prefix,state});
    await page.waitForFunction(() => !document.getAnimations().some(animation => animation.playState === 'running'));
    const result = await page.evaluate(() => {const element=document.querySelector('#content');const css=getComputedStyle(element);const rect=element.getBoundingClientRect();return {transition:css.transitionProperty,left:css.marginLeft,right:css.marginRight,x:rect.x,width:rect.width,overflow:document.documentElement.scrollWidth>innerWidth+1};});
    if (width<768 && (result.transition!=='none'||result.left!=='0px'||result.right!=='0px'||result.overflow)) throw new Error(JSON.stringify({direction,width,prefix,state,...result}));
    if (width>=768 && result.transition==='none') throw new Error('Desktop transition was disabled');
    if (width>=768 && prefix==='svadmin-sidebar-content') {const offset=state==='expanded'?252:70;if(result[direction==='ltr'?'left':'right']!==`${offset}px`||result.width!==width-offset||result.overflow)throw new Error(JSON.stringify({direction,width,prefix,state,...result}));}
    checks.push({direction,width,prefix,state,...result});
  }
  return {passed:checks.length,checks};
}
