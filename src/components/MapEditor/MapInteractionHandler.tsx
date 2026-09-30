import React, { useEffect } from 'react';
import { useMap } from '@vis.gl/react-google-maps';

interface MapInteractionHandlerProps {
  mode: 'SELECT' | 'ADD_NODE' | 'CONNECT_CABLE' | 'MEASURE';
  onMapClick: (e: google.maps.MapMouseEvent) => void;
}

export const MapInteractionHandler: React.FC<MapInteractionHandlerProps> = ({
  mode,
  onMapClick,
}) => {
  const map = useMap();

  useEffect(() => {
    if (!map || typeof google === 'undefined') return;

    // Change cursor based on mode
    if (mode === 'ADD_NODE') {
      map.setOptions({ draggableCursor: 'crosshair' });
    } else if (mode === 'CONNECT_CABLE') {
      map.setOptions({ draggableCursor: 'copy' });
    } else {
      map.setOptions({ draggableCursor: null });
    }

    const listener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
      onMapClick(e);
    });

    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [map, mode, onMapClick]);

  return null;
};
