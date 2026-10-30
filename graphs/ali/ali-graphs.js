/* Two D3 visualizations. */
(() => {
  const configs = [
    { target: '#visual-3', file: "../graphs/ali/life_expectancy.csv", keys: [
      {key:'female', label:'Female', color:'#8869bd'},
      {key:'male', label:'Male', color:'#1e91a8'}
    ], unit:'years' },
    { target: '#visual-4', file: "../graphs/ali/dependency.csv", keys: [
      {key:'younger', label:'Younger', color:'#e69b42'},
      {key:'older', label:'Older', color:'#3476bb'}
    ], unit:'per 100 working-age people' }
  ];
  const width=750, height=350;
  const margin={top:20,right:22,bottom:43,left:62};
  const iw=width-margin.left-margin.right;
  const ih=height-margin.top-margin.bottom;
  let datasets=[], currentCountry='United States', range=null;
  const tooltip=d3.select('body').append('div')
    .attr('class','ali-tooltip').style('display','none');
  const countryControl=d3.select('#ali-country');
  if (countryControl.empty()) return;

  Promise.all(configs.map(c => d3.csv(c.file, d => {
    const row={country:d.country,year:+d.year};
    c.keys.forEach(k => row[k.key]= d[k.key] === '' ? null : Number(d[k.key]));
    return row;
  }))).then(result => {
    datasets=result;
    const available=new Set(result[1].map(d=>d.country));
    const countries=[...new Set(result[0].map(d=>d.country))]
      .filter(name=>available.has(name)).sort();
    if (!countries.length) throw new Error('No overlapping countries in Ali CSV files');
    if (!countries.includes(currentCountry)) currentCountry=countries[0];
    countryControl.selectAll('option').data(countries).join('option')
      .attr('value',d=>d).text(d=>d);
    countryControl.property('value',currentCountry).on('change',event=>{
      currentCountry=event.target.value; range=null; render();
    });
    d3.select('#ali-reset').on('click',()=>{range=null;render();});
    render();
  }).catch(error => {
    console.error('Ali charts failed to load:',error);
    d3.select('#visual-3').text('Could not load life expectancy data. Check CSV paths.');
    d3.select('#visual-4').text('Could not load age dependency data. Check CSV paths.');
  });

  function render() {
    tooltip.style('display','none');
    d3.select('#ali-window').text(range ? `${range[0]}–${range[1]}` : 'All years');
    configs.forEach((c,i)=>draw(c,datasets[i]));
  }

  function draw(c,source) {
    const rows=source.filter(d=>d.country===currentCountry).sort((a,b)=>a.year-b.year);
    const svg=d3.select(c.target).selectAll('svg').data([null]).join('svg')
      .attr('viewBox',`0 0 ${width} ${height}`).attr('role','img')
      .attr('aria-label',`${currentCountry} ${c.target==='#visual-3'?'life expectancy':'age dependency'} by year`);
    svg.selectAll('*').remove();
    if (!rows.length) return;
    const full=d3.extent(rows,d=>d.year);
    const visible=range||full;
    const subset=rows.filter(d=>d.year>=visible[0]&&d.year<=visible[1]);
    const x=d3.scaleLinear().domain(visible[0]===visible[1]?[visible[0]-.5,visible[1]+.5]:visible).range([0,iw]);
    const vals=subset.flatMap(d=>c.keys.map(k=>d[k.key]).filter(Number.isFinite));
    if (!vals.length) return;
    const lower=c.target==='#visual-3'?Math.max(0,d3.min(vals)-8):0;
    const upper=Math.max(lower+1,d3.max(vals)*1.08);
    const y=d3.scaleLinear().domain([lower,upper]).nice().range([ih,0]);
    const g=svg.append('g').attr('transform',`translate(${margin.left},${margin.top})`);
    g.append('g').attr('class','ali-grid')
      .call(d3.axisLeft(y).ticks(5).tickSize(-iw).tickFormat(''))
      .call(a=>a.select('.domain').remove());
    g.append('g').attr('class','ali-axis')
      .call(d3.axisLeft(y).ticks(5).tickSize(0).tickPadding(10))
      .call(a=>a.select('.domain').remove());
    g.append('g').attr('class','ali-axis')
      .attr('transform',`translate(0,${ih})`)
      .call(d3.axisBottom(x).ticks(7).tickSize(0).tickPadding(10).tickFormat(d3.format('d')));
    const lineLayer=g.append('g');
    const lineBuilder=k=>d3.line()
      .defined(d=>Number.isFinite(d[k.key]))
      .x(d=>x(d.year)).y(d=>y(d[k.key]))
      .curve(d3.curveMonotoneX);
    c.keys.forEach(k=>lineLayer.append('path').datum(subset)
      .attr('class','ali-line').attr('stroke',k.color).attr('d',lineBuilder(k)));
    const marker=g.append('g').style('display','none');
    marker.append('line').attr('class','ali-crosshair').attr('y1',0).attr('y2',ih);
    const dots=marker.selectAll('circle').data(c.keys).join('circle')
      .attr('r',5).attr('fill',k=>k.color).attr('stroke','white').attr('stroke-width',2);

    // Brush events run independently from team-wide year slider.
    let selecting=false;
    const brush=d3.brushX().extent([[0,0],[iw,ih]])
      .on('start',event=>{
        if(!event.sourceEvent)return;
        selecting=true; tooltip.style('display','none');marker.style('display','none');
      })
      .on('end',event=>{
        if(!event.sourceEvent)return;
        selecting=false;
        if(!event.selection)return;
        const [a,b]=event.selection.map(x.invert).map(Math.round).sort((m,n)=>m-n);
        if(b>a){range=[a,b];render();}
        else g.select('.ali-brush').call(brush.move,null);
      });
    g.append('g').attr('class','ali-brush').call(brush)
      .on('mousemove',function(event){
        if(selecting||event.buttons){tooltip.style('display','none');marker.style('display','none');return;}
        const [mx,my]=d3.pointer(event,this);
        if(mx<0||mx>iw||my<0||my>ih||subset.length===0){hide();return;}
        // Determine distance to a segment between the adjacent annual observations.
        // This follows the line rather than requiring exact hovering on a year dot.
        let bestDistance=Infinity, bestRow=null;
        c.keys.forEach(k=>{
          for(let j=0;j<subset.length-1;j++){
            const a=subset[j],b=subset[j+1];
            if(!Number.isFinite(a[k.key])||!Number.isFinite(b[k.key]))continue;
            const ax=x(a.year),ay=y(a[k.key]),bx=x(b.year),by=y(b[k.key]);
            const dx=bx-ax,dy=by-ay;
            const t=Math.max(0,Math.min(1,((mx-ax)*dx+(my-ay)*dy)/(dx*dx+dy*dy||1)));
            const dist=Math.hypot(mx-(ax+t*dx),my-(ay+t*dy));
            if(dist<bestDistance){bestDistance=dist;bestRow=Math.abs(mx-ax)<Math.abs(mx-bx)?a:b;}
          }
          // Also catch an isolated observation.
          if(subset.length===1&&Number.isFinite(subset[0][k.key])){
            const d=Math.hypot(mx-x(subset[0].year),my-y(subset[0][k.key]));
            if(d<bestDistance){bestDistance=d;bestRow=subset[0];}
          }
        });
        if(bestDistance>12||!bestRow){hide();return;}
        marker.style('display',null).attr('transform',`translate(${x(bestRow.year)},0)`);
        dots.style('display',k=>Number.isFinite(bestRow[k.key])?null:'none')
          .attr('cy',k=>y(bestRow[k.key]));
        const lines=c.keys.map(k=>`${k.label}: ${Number.isFinite(bestRow[k.key])?bestRow[k.key].toFixed(1):'N/A'}`).join('<br>');
        tooltip.html(`<strong>${currentCountry} · ${bestRow.year}</strong><br>${lines}<br><small>${c.unit}</small>`)
          .style('display','block');
        const tipWidth=tooltip.node().getBoundingClientRect().width;
        const px=event.clientX+tipWidth+24>window.innerWidth?event.pageX-tipWidth-16:event.pageX+16;
        tooltip.style('left',`${Math.max(8,px)}px`)
          .style('top',`${Math.max(8,event.pageY-65)}px`);
      }).on('mouseleave',hide);
    function hide(){marker.style('display','none');tooltip.style('display','none');}
  }
})();
