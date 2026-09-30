import React, { useEffect, useRef } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import { FiberCable, ODP } from '../../types';

interface MapOverlayLayersProps {
  cables: FiberCable[];
  odps: ODP[];
  showCoverageRadius: boolean;
  selectedCableId: string | null;
  onSelectCable: (cable: FiberCable) => void;
}

export const MapOverlayLayers: React.FC<MapOverlayLayersProps> = ({
  cables,
  odps,
  showCoverageRadius,
  selectedCableId,
  onSelectCable,
}) => {
  const map = useMap();
  const polylinesRef = useRef<Map<string, google.maps.Polyline>>(new Map());
  const circlesRef = useRef<Map<string, google.maps.Circle>>(new Map());

  // Render or update polylines for Fiber Cables
  useEffect(() => {
    if (!map || typeof google === 'undefined' || !google.maps) return;

    // Clean up removed cables
    const currentCableIds = new Set(cables.map((c) => c.id));
    polylinesRef.current.forEach((polyline, id) => {
      if (!currentCableIds.has(id)) {
        polyline.setMap(null);
        polylinesRef.current.delete(id);
      }
    });

    // Create or update polylines
    cables.forEach((cable) => {
      let polyline = polylinesRef.current.get(cable.id);
      const isSelected = cable.id === selectedCableId;
      const isCut = cable.status === 'CUT';

      const strokeColor = isCut ? '#ef4444' : isSelected ? '#ec4899' : cable.tubeColor || '#3b82f6';
      const strokeWeight = isSelected ? 6 : cable.fromNodeType === 'OLT' ? 5 : cable.toNodeType === 'ONU' ? 2 : 4;
      const strokeOpacity = isCut ? 0.6 : 0.85;

      if (!polyline) {
        polyline = new google.maps.Polyline({
          path: cable.path,
          strokeColor,
          strokeOpacity,
          strokeWeight,
          map,
          clickable: true,
          zIndex: isSelected ? 10 : 2,
        });

        polyline.addListener('click', () => {
          onSelectCable(cable);
        });

        polylinesRef.current.set(cable.id, polyline);
      } else {
        polyline.setPath(cable.path);
        polyline.setOptions({
          strokeColor,
          strokeOpacity,
          strokeWeight,
          zIndex: isSelected ? 10 : 2,
        });
      }
    });

    return () => {
      // Cleanup on unmount
    };
  }, [map, cables, selectedCableId, onSelectCable]);

  // Render or update coverage circles around ODPs
  useEffect(() => {
    if (!map || typeof google === 'undefined' || !google.maps) return;

    if (!showCoverageRadius) {
      circlesRef.current.forEach((circle) => circle.setMap(null));
      circlesRef.current.clear();
      return;
    }

    const currentOdpIds = new Set(odps.map((o) => o.id));
    circlesRef.current.forEach((circle, id) => {
      if (!currentOdpIds.has(id)) {
        circle.setMap(null);
        circlesRef.current.delete(id);
      }
    });

    odps.forEach((odp) => {
      let circle = circlesRef.current.get(odp.id);
      if (!circle) {
        circle = new google.maps.Circle({
          map,
          center: odp.location,
          radius: odp.coverageRadiusMeters || 200,
          fillColor: '#8b5cf6',
          fillOpacity: 0.12,
          strokeColor: '#7c3aed',
          strokeOpacity: 0.45,
          strokeWeight: 1.5,
          clickable: false,
          zIndex: 1,
        });
        circlesRef.current.set(odp.id, circle);
      } else {
        circle.setCenter(odp.location);
        circle.setRadius(odp.coverageRadiusMeters || 200);
      }
    });
  }, [map, odps, showCoverageRadius]);

  // Clean all on full unmount
  useEffect(() => {
    return () => {
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current.clear();
      circlesRef.current.forEach((c) => c.setMap(null));
      circlesRef.current.clear();
    };
  }, []);

  return null;
};
