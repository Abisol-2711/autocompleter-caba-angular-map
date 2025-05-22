import {
  Component,
  ElementRef,
  AfterViewInit,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import { CommonModule,  } from '@angular/common';
import 'mapa-gcba/dist/assets/css/main.css';
// @ts-ignore
import MapaInteractivo from 'mapa-gcba/dist/models/MapaInteractivo';
// @ts-ignore
import autoComplete from '@tarekraafat/autocomplete.js';
// @ts-ignore
import { Autocompleter } from '../../node_modules/autocompleter-caba/dist/index.js';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div>
      <input id="autoComplete" #autoInput />
      <div class="switchContainer">
        Activar places:
        <label class="switch">
          <input type="checkbox" id="switchPlaces" #switchPlaces />
          <span class="slider round"></span>
        </label>
      </div>
      <div id="mapa">
        <div id="map" #mapaDiv></div>
      </div>
    </div>
  `,
  styleUrls: ['./app.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class AutocompleteMapComponent implements AfterViewInit {
  @ViewChild('mapaDiv', { static: false }) mapRef!: ElementRef;
  @ViewChild('switchPlaces', { static: false }) switchRef!: ElementRef;
  @ViewChild('autoInput', { static: false }) autoInputRef!: ElementRef;

  mapa: any;

  ngAfterViewInit() {
    const existingMap = document.getElementById('map');
    // existingMap.innerHTML = "";
    if ((existingMap as any)?._leaflet_id) {
      (existingMap as any)._leaflet_id = null;
    }

    this.mapa = new MapaInteractivo('map');

    const switchElement = this.switchRef.nativeElement as HTMLInputElement;

    let isDragging = false;
    let mouseMoved = false;

    this.mapa.map.on('mousedown', () => {
      mouseMoved = false;
      isDragging = false;
    });

    this.mapa.map.on('mousemove', () => {
      mouseMoved = true;
    });

    this.mapa.map.on('mouseup', () => {
      if (mouseMoved) {
        isDragging = true;
      }
    });

    const handleClick = (e: any) => {
      if (isDragging) return;
      const { lat, lng } = e.latlng;
      if (!switchElement.checked) this.mapa.map.flyTo({ lat, lng }, 16);
      this.mapa.reverseGeocoding(e);
    };

    const handleChangeSwitchPlaces = (e: any) => {
      if (e.target.checked) {
        this.mapa.setReverseOptions({
          active: true,
          type: 'places',
          radius: 1000,
        });
      } else {
        this.mapa.setReverseOptions({
          active: true,
          type: 'address',
          radius: 0,
        });
      }
    };

    this.mapa.map.on('click', handleClick);
    switchElement.addEventListener('change', handleChangeSwitchPlaces);

    const autocompleter = new Autocompleter();
    autocompleter.setApiBaseUrl(environment.DEV);
    // autocompleter.setCredentials( environment.CLIENT_ID_PROD, environment.CLIENT_SECRET_PROD);
    autocompleter.setGeocodingMethods(['Geocodificacion Directa']);
    console.log(
      'Métodos geocodificación permitidos:',
      autocompleter.getGeocodingMethods()
    );

    const autoCompleteJS = new autoComplete({
      selector: '#autoComplete',
      placeHolder: 'Buscar una dirección',
      debounce: 500,
      threshold: 3,
      submit: true,
      searchEngine: (_: any, record: any) => record,
      data: {
        src: async (query: string) => {
          try {
            const res = await autocompleter.getSuggestions(query);
            return res.filter((data: any) => !data.error);
          } catch (error) {
            console.log({ error });
            return [];
          }
        },
        keys: ['value'],
      },
      resultsList: {
        noResults: true,
        maxResults: undefined,
        element: (list: any, data: any) => {
          if (!data.results.length) {
            const message = document.createElement('div');
            message.setAttribute('class', 'no_result');
            message.innerHTML = `<span>Found No Results for "${data.query}"</span>`;
            list.prepend(message);
          }
        },
      },
      resultItem: {
        highlight: true,
      },
      events: {
        input: {
          selection: (event: any) => {
            const direccion = event.detail.selection.value.value;
            autoCompleteJS.input.value = direccion;
            autocompleter
              .getSearch(direccion)
              .then((resultados: any) => {
                if (resultados.status_code !== 200) {
                  return Promise.reject(resultados.error);
                }
                const { coordenadas, coordenada_x, coordenada_y } =
                  resultados.data;
                const lat = coordenadas?.y || coordenada_y;
                const lng = coordenadas?.x || coordenada_x;
                if (lat && lng) {
                  this.mapa.setMarkerView(lat, lng);
                  this.mapa.map.flyTo({ lat, lng }, 16);
                }
                return null;
              })
              .catch((error: any) => console.log(error));
          },
        },
      },
    });
  }
}