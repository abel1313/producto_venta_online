import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

/** Título y descripción de siempre (los de index.html), para regresar al salir de una página. */
const TITULO_TIENDA = 'Novedades Jade — Bolsas, Pantalones, Blusas y Perfumes';
const DESCRIPCION_TIENDA =
  'Tienda en línea de moda femenina. Bolsas, pantalones, blusas y perfumes originales de 10 ml. Envíos y pedidos en línea.';
const ID_JSON_LD = 'pk-jsonld-producto';

export interface IProductoSeo {
  nombre:       string;
  descripcion?: string | null;
  precio:       number;
  disponible:   boolean;
  imagen?:      string | null;
  marca?:       string | null;
  codigo?:      string | null;
  url:          string;
}

/**
 * SEO de la tienda (LEGAL_PLAN_DE_ACCION.md punto 20, recomendación, no ley). Google sí ejecuta
 * la app, así que lo que se ponga aquí lo lee; WhatsApp y Facebook no (para ellos sigue la
 * imagen fija de index.html).
 */
@Injectable({ providedIn: 'root' })
export class SeoService {

  constructor(private readonly title: Title,
              private readonly meta: Meta,
              @Inject(DOCUMENT) private readonly doc: Document) {}

  /** Título, descripción y datos estructurados de un producto (schema.org/Product). */
  producto(p: IProductoSeo): void {
    const descripcion = (p.descripcion || `${p.nombre} en Novedades Jade.`).slice(0, 160);
    this.title.setTitle(`${p.nombre} — Novedades Jade`);
    this.meta.updateTag({ name: 'description', content: descripcion });
    this.quitarJsonLd();
    const datos = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: p.nombre,
      description: descripcion,
      ...(p.imagen ? { image: [p.imagen] } : {}),
      ...(p.marca ? { brand: { '@type': 'Brand', name: p.marca } } : {}),
      ...(p.codigo ? { sku: p.codigo } : {}),
      offers: {
        '@type': 'Offer',
        url: p.url,
        priceCurrency: 'MXN',
        price: p.precio.toFixed(2),
        availability: p.disponible ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition'
      }
    };
    const script = this.doc.createElement('script');
    script.type = 'application/ld+json';
    script.id = ID_JSON_LD;
    script.text = JSON.stringify(datos);
    this.doc.head.appendChild(script);
  }

  /** Página que no existe: que Google no la guarde (soft 404 en una app de una sola página). */
  noIndexar(): void {
    this.meta.updateTag({ name: 'robots', content: 'noindex' });
  }

  /** Regresa todo a como está en index.html. */
  restablecer(): void {
    this.title.setTitle(TITULO_TIENDA);
    this.meta.updateTag({ name: 'description', content: DESCRIPCION_TIENDA });
    this.meta.updateTag({ name: 'robots', content: 'index, follow' });
    this.quitarJsonLd();
  }

  private quitarJsonLd(): void {
    this.doc.getElementById(ID_JSON_LD)?.remove();
  }
}
