"use client";

import * as L from "leaflet";
import "leaflet.markercluster";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { MapSpotSummary } from "@/domain/spots/dto";
import { rememberDetailEntry } from "@/infrastructure/navigation/detail-return.client";

const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>';

type LeafletMapProps = {
  spots: readonly MapSpotSummary[];
  favoriteSpotIds: readonly string[];
};

export function LeafletMap({ spots, favoriteSpotIds }: LeafletMapProps) {
  const router = useRouter();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const [hasTileError, setHasTileError] = useState(false);

  useEffect(() => {
    const mapContainer = mapContainerRef.current;

    if (mapContainer === null) {
      return;
    }

    const map = L.map(mapContainer, {
      center: [18, 0],
      zoom: 2,
      minZoom: 2,
      maxBoundsViscosity: 0.8,
      worldCopyJump: true,
    });
    const tileLayer = L.tileLayer(TILE_URL, {
      attribution: TILE_ATTRIBUTION,
      maxZoom: 19,
    });
    const clusterGroup = L.markerClusterGroup({
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      spiderfyOnMaxZoom: true,
      iconCreateFunction(cluster) {
        return L.divIcon({
          className: "marker-cluster-custom",
          html: `<span>${cluster.getChildCount()}</span>`,
          iconSize: L.point(44, 44),
        });
      },
    });

    function handleTileError() {
      setHasTileError(true);
    }

    tileLayer.on("tileerror", handleTileError);
    tileLayer.addTo(map);
    clusterGroup.addTo(map);
    mapRef.current = map;
    clusterGroupRef.current = clusterGroup;

    const resizeFrame = window.requestAnimationFrame(() => map.invalidateSize());

    return () => {
      window.cancelAnimationFrame(resizeFrame);
      tileLayer.off("tileerror", handleTileError);
      clusterGroup.clearLayers();
      map.remove();
      clusterGroupRef.current = null;
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const clusterGroup = clusterGroupRef.current;

    if (clusterGroup === null) {
      return;
    }

    const favoriteSpotIdSet = new Set(favoriteSpotIds);
    const markers: L.Marker[] = [];
    const removePopupListeners: Array<() => void> = [];

    for (const spot of spots) {
      const marker = L.marker(
        [spot.coordinates.latitude, spot.coordinates.longitude],
        {
          icon: createSpotIcon(favoriteSpotIdSet.has(spot.id)),
          title: spot.name,
          alt: `${spot.name}の地図ピン`,
        },
      );
      const popup = createSpotPopup(spot);
      const detailButton = popup.querySelector<HTMLButtonElement>("button");

      if (detailButton !== null) {
        const openDetail = () => {
          rememberDetailEntry(spot.slug, "/map");
          router.push(`/spots/${spot.slug}`);
        };
        detailButton.addEventListener("click", openDetail);
        removePopupListeners.push(() => detailButton.removeEventListener("click", openDetail));
      }

      marker.bindPopup(popup, { minWidth: 220, maxWidth: 260 });
      markers.push(marker);
    }

    clusterGroup.clearLayers();
    clusterGroup.addLayers(markers);

    return () => {
      for (const removeListener of removePopupListeners) {
        removeListener();
      }

      clusterGroup.clearLayers();
    };
  }, [favoriteSpotIds, router, spots]);

  return (
    <>
      {hasTileError ? (
        <div className="map-banner" role="status">
          地図タイルの一部を読み込めませんでした。ピンの概要と詳細ページは引き続き利用できます。
        </div>
      ) : null}
      <div
        ref={mapContainerRef}
        className="leaflet-map"
        aria-label="観光地を表示する世界地図"
      />
    </>
  );
}

function createSpotIcon(isFavorite: boolean): L.DivIcon {
  const markerClass = isFavorite ? "spot-marker spot-marker--favorite" : "spot-marker";

  return L.divIcon({
    className: "spot-marker-container",
    html: `<span class="${markerClass}" aria-hidden="true"></span>`,
    iconSize: L.point(34, 34),
    iconAnchor: L.point(17, 34),
    popupAnchor: L.point(0, -34),
  });
}

function createSpotPopup(spot: MapSpotSummary): HTMLDivElement {
  const popup = document.createElement("div");
  popup.className = "map-popup";

  const image = document.createElement("img");
  image.className = "map-popup__image";
  image.src = spot.mainImage.url;
  image.alt = spot.mainImage.alt;
  image.width = 240;
  image.height = Math.round((240 * spot.mainImage.height) / spot.mainImage.width);
  image.loading = "lazy";
  image.addEventListener(
    "error",
    () => {
      image.src = "/images/spot-fallback.svg";
    },
    { once: true },
  );

  const title = document.createElement("strong");
  title.className = "map-popup__title";
  title.textContent = spot.name;

  const location = document.createElement("span");
  location.className = "map-popup__location";
  location.textContent = `${spot.country} · ${spot.city}`;

  const detailButton = document.createElement("button");
  detailButton.className = "map-popup__button";
  detailButton.type = "button";
  detailButton.textContent = "詳しく見る";
  detailButton.setAttribute("aria-label", `${spot.name}の詳細を開く`);

  popup.append(image, title, location, detailButton);
  return popup;
}
