import { approximateLocation } from './localizacao.mjs?v=a72bd4388845';
const points=new WeakMap();
export const locationPicker = () => `<div class="location-picker full"><p class="micro">Para calcular distâncias, confirme a região pelo GPS ou no mapa. Digitar o endereço não calcula coordenadas. Não informe número, apartamento ou casa.</p><div class="location-actions"><button type="button" class="btn secondary" data-locate>Usar minha localização</button><button type="button" class="btn secondary" data-map>Marcar região no mapa</button><button type="button" class="btn secondary" data-forget-location>Limpar localização</button></div><p class="location-status micro" role="status">Localização não definida. Você pode continuar sem ela.</p><div class="location-map-wrap" hidden><p class="micro">O mapa carrega imagens do OpenStreetMap, que recebe seu IP e a região visualizada. Clique para centralizar, use as setas e confirme o entorno; não marque a porta da residência.</p><div class="location-map" tabindex="0" role="region" aria-label="Mapa de referência. Use as setas para mover a região."></div><div class="map-controls"><button type="button" data-pan="0,-1" aria-label="Mover para norte">↑</button><button type="button" data-pan="-1,0" aria-label="Mover para oeste">←</button><button type="button" data-pan="1,0" aria-label="Mover para leste">→</button><button type="button" data-pan="0,1" aria-label="Mover para sul">↓</button><button type="button" data-zoom="1" aria-label="Aproximar mapa">+</button><button type="button" data-zoom="-1" aria-label="Afastar mapa">−</button><button type="button" class="btn primary" data-confirm-map>Usar este entorno</button></div><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© colaboradores do OpenStreetMap</a> · <a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noopener">Corrigir o mapa</a></div></div>`;
export function getLocation(root) { return points.get(root?.querySelector('.location-picker')) || null; }
export function initLocationPickers(root,config={}) {
  for(const picker of root.querySelectorAll('.location-picker:not([data-ready])')) {
    picker.dataset.ready='true';
    const status=picker.querySelector('.location-status'), map=picker.querySelector('.location-map');
    let center={lat:-9.39,lng:-40.5}, zoom=13, pending=0;
    const world=point=>({x:(point.lng+180)/360*256*2**zoom,y:(1-Math.asinh(Math.tan(point.lat*Math.PI/180))/Math.PI)/2*256*2**zoom});
    const geographic=point=>({lng:point.x/(256*2**zoom)*360-180,lat:Math.atan(Math.sinh(Math.PI*(1-2*point.y/(256*2**zoom))))*180/Math.PI});
    const set=point=>{ const safe=approximateLocation(point); points.set(picker,safe); status.textContent=safe?'Região aproximada definida (~1 km). O ponto exato foi descartado.':'Localização não definida. Você pode continuar sem ela.'; picker.dispatchEvent(new CustomEvent('locationchange',{bubbles:true,detail:safe})); };
    const render=()=>{
      const p=world(center), width=map.clientWidth, height=map.clientHeight, left=p.x-width/2, top=p.y-height/2;
      map.replaceChildren();
      for(let x=Math.floor(left/256);x<=Math.floor((left+width)/256);x++) for(let y=Math.floor(top/256);y<=Math.floor((top+height)/256);y++) {
        if(x<0 || y<0 || x>=2**zoom || y>=2**zoom) continue;
        const img=document.createElement('img');
        const template=config.mapTileUrl || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
        if(!template.startsWith('https://')) continue;
        img.src=template.replace('{z}',zoom).replace('{x}',x).replace('{y}',y); img.alt=''; img.draggable=false;
        img.style.cssText=`position:absolute;left:${x*256-left}px;top:${y*256-top}px;width:256px;height:256px;max-width:none`;
        img.onerror=()=>{status.textContent='Mapa indisponível. Tente o GPS ou continue sem distância; não há geocodificação automática.';};
        map.append(img);
      }
      const marker=document.createElement('span'); marker.className='map-crosshair'; marker.textContent='+'; marker.setAttribute('aria-hidden','true'); map.append(marker);
    };
    const move=(dx,dy)=>{const p=world(center);center=geographic({x:p.x+dx,y:p.y+dy});center.lat=Math.max(-80,Math.min(80,center.lat));center.lng=Math.max(-179,Math.min(179,center.lng));render();};
    map.addEventListener('click',e=>{const rect=map.getBoundingClientRect();move(e.clientX-rect.left-rect.width/2,e.clientY-rect.top-rect.height/2);});
    map.addEventListener('keydown',e=>{const moves={ArrowLeft:[-100,0],ArrowRight:[100,0],ArrowUp:[0,-100],ArrowDown:[0,100]};if(moves[e.key]){e.preventDefault();move(...moves[e.key]);}});
    picker.addEventListener('click',e=>{
      const b=e.target.closest('button');if(!b)return;
      if(b.hasAttribute('data-forget-location')){pending++;set(null);picker.querySelector('.location-map-wrap').hidden=true;}
      if(b.hasAttribute('data-locate')) {
        if(!navigator.geolocation){status.textContent='GPS não disponível. Marque a região no mapa.';return;}
        const request=++pending;status.textContent='Aguardando sua permissão de localização…';
        navigator.geolocation.getCurrentPosition(position=>{
          if(request!==pending || !picker.isConnected)return;
          if(position.coords.accuracy>1500){status.textContent='Sinal muito impreciso. Confirme o entorno no mapa.';return;}
          set({lat:position.coords.latitude,lng:position.coords.longitude});center=points.get(picker);zoom=14;
          if(!picker.querySelector('.location-map-wrap').hidden)render();
        },()=>{if(request===pending && picker.isConnected)status.textContent='Localização não autorizada ou indisponível. Use o mapa ou continue sem distância.';},{enableHighAccuracy:false,timeout:10000,maximumAge:60000});
      }
      if(b.hasAttribute('data-map')){picker.querySelector('.location-map-wrap').hidden=false;center=points.get(picker)||center;render();}
      if(b.dataset.pan){move(...b.dataset.pan.split(',').map(v=>Number(v)*100));}
      if(b.dataset.zoom){zoom=Math.max(10,Math.min(17,zoom+Number(b.dataset.zoom)));render();}
      if(b.hasAttribute('data-confirm-map')){pending++;set(center);picker.querySelector('.location-map-wrap').hidden=true;}
    });
  }
}
