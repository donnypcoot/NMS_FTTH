// Source: Google Maps Platform Code Assist
import React, { useState, useMemo, useCallback } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
} from '@vis.gl/react-google-maps';
import {
  Customer,
  Device,
  FiberCable,
  ODP,
  OdpPort,
} from '../../types';
import { DEFAULT_MAP_CENTER } from '../../data/mockData';
import { apiService } from '../../services/apiService';
import { MapOverlayLayers } from './MapOverlayLayers';
import { MapInteractionHandler } from './MapInteractionHandler';
import {
  Router as RouterIcon,
  Server,
  Wifi,
  Radio,
  MapPin,
  Layers,
  Search,
  Plus,
  Compass,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Activity,
  Trash2,
  RefreshCw,
  Power,
  Maximize2,
  Download,
  Info,
  Sliders,
  Cable,
} from 'lucide-react';

interface NetworkMapEditorProps {
  devices: Device[];
  odps: ODP[];
  cables: FiberCable[];
  customers: Customer[];
  onUpdateDevices: (devices: Device[]) => void;
  onUpdateOdps: (odps: ODP[]) => void;
  onUpdateCables: (cables: FiberCable[]) => void;
  onUpdateCustomers: (customers: Customer[]) => void;
}

type EditorMode = 'SELECT' | 'ADD_NODE' | 'CONNECT_CABLE' | 'MEASURE';

export const NetworkMapEditor: React.FC<NetworkMapEditorProps> = ({
  devices,
  odps,
  cables,
  customers,
  onUpdateDevices,
  onUpdateOdps,
  onUpdateCables,
  onUpdateCustomers,
}) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  // Mode and tools
  const [mode, setMode] = useState<EditorMode>('SELECT');
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid'>('roadmap');
  const [showCoverageRadius, setShowCoverageRadius] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Filtering
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Selected entities
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [selectedOdp, setSelectedOdp] = useState<ODP | null>(null);
  const [selectedCable, setSelectedCable] = useState<FiberCable | null>(null);

  // Cable creation state
  const [cableSourceNode, setCableSourceNode] = useState<{ id: string; name: string; lat: number; lng: number; type: any } | null>(null);

  // Add node modal state
  const [newNodeCoords, setNewNodeCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [newNodeType, setNewNodeType] = useState<'ODP' | 'ONU' | 'ODC' | 'OLT'>('ODP');
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodePorts, setNewNodePorts] = useState<number>(8);
  const [newNodeCustomer, setNewNodeCustomer] = useState({
    name: '',
    phone: '',
    packageId: 'PKG-20M',
    odpId: '',
  });

  // Action states
  const [actionLoading, setActionLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Filtered devices
  const filteredDevices = useMemo(() => {
    return devices.filter((d) => {
      if (filterType !== 'ALL') {
        if (filterType === 'ONU' && d.type !== 'ONU') return false;
        if (filterType === 'CORE' && (d.type === 'ONU' || d.type === 'ODP')) return false;
      }
      if (filterStatus !== 'ALL') {
        if (filterStatus === 'ONLINE' && d.status !== 'ONLINE') return false;
        if (filterStatus === 'OFFLINE' && d.status !== 'OFFLINE') return false;
        if (filterStatus === 'WARNING' && d.status !== 'WARNING') return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          d.name.toLowerCase().includes(q) ||
          d.ipAddress.toLowerCase().includes(q) ||
          (d.serialNumber && d.serialNumber.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [devices, filterType, filterStatus, searchQuery]);

  // Filtered ODPs
  const filteredOdps = useMemo(() => {
    return odps.filter((o) => {
      if (filterType !== 'ALL' && filterType !== 'ODP') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          o.name.toLowerCase().includes(q) ||
          o.code.toLowerCase().includes(q) ||
          o.location.address.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [odps, filterType, searchQuery]);

  // Handle map click
  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();

    if (mode === 'ADD_NODE') {
      setNewNodeCoords({ lat, lng });
      setNewNodeName(`ODP-${Math.floor(10 + Math.random() * 89)}/08`);
      return;
    }

    if (mode === 'SELECT') {
      setSelectedDevice(null);
      setSelectedOdp(null);
      setSelectedCable(null);
    }
  }, [mode]);

  // Handle node click during cable connection
  const handleNodeClickForCable = (node: { id: string; name: string; lat: number; lng: number; type: any }) => {
    if (mode !== 'CONNECT_CABLE') return;

    if (!cableSourceNode) {
      setCableSourceNode(node);
      setActionFeedback(`Node awal dipilih: ${node.name}. Sekarang klik node tujuan.`);
      setTimeout(() => setActionFeedback(null), 3500);
    } else {
      if (cableSourceNode.id === node.id) {
        setActionFeedback('Node awal dan tujuan tidak boleh sama.');
        setTimeout(() => setActionFeedback(null), 2500);
        return;
      }

      // Calculate approximate distance
      const radlat1 = (Math.PI * cableSourceNode.lat) / 180;
      const radlat2 = (Math.PI * node.lat) / 180;
      const theta = cableSourceNode.lng - node.lng;
      const radtheta = (Math.PI * theta) / 180;
      let dist =
        Math.sin(radlat1) * Math.sin(radlat2) +
        Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
      dist = Math.acos(Math.min(dist, 1));
      dist = (dist * 180) / Math.PI;
      dist = dist * 60 * 1.1515 * 1.609344 * 1000; // in meters

      const newCable: FiberCable = {
        id: `CABLE-${Date.now()}`,
        name: `Kabel ${cableSourceNode.name} -> ${node.name}`,
        fromNodeId: cableSourceNode.id,
        fromNodeType: cableSourceNode.type,
        toNodeId: node.id,
        toNodeType: node.type,
        coreCount: node.type === 'ONU' || cableSourceNode.type === 'ONU' ? 1 : 12,
        tubeColor: node.type === 'ONU' ? '#64748b' : '#3b82f6',
        lengthMeters: Math.round(dist),
        attenuationDb: +(dist * 0.00035 + (node.type === 'ODP' ? 10.5 : 0.2)).toFixed(2),
        status: 'NORMAL',
        path: [
          { lat: cableSourceNode.lat, lng: cableSourceNode.lng },
          { lat: node.lat, lng: node.lng },
        ],
      };

      const updatedCables = [...cables, newCable];
      onUpdateCables(updatedCables);
      apiService.saveFiberCables(updatedCables);
      apiService.addLog('SUCCESS', 'MAP_EDITOR', `Kabel fiber baru dibentang: ${newCable.name} (${newCable.lengthMeters} m)`);

      setCableSourceNode(null);
      setMode('SELECT');
      setActionFeedback(`Kabel berhasil disambungkan (${Math.round(dist)} m)!`);
      setTimeout(() => setActionFeedback(null), 3000);
    }
  };

  // Create new node from modal
  const handleCreateNode = () => {
    if (!newNodeCoords) return;

    if (newNodeType === 'ODP') {
      const ports: OdpPort[] = Array.from({ length: newNodePorts }, (_, i) => ({
        portNumber: i + 1,
        status: 'EMPTY',
      }));

      const newOdp: ODP = {
        id: `ODP-${Date.now().toString().slice(-4)}`,
        code: newNodeName || `ODP-NEW-01`,
        name: newNodeName || `ODP-NEW-01/08`,
        totalPorts: newNodePorts as 8 | 16 | 24,
        usedPorts: 0,
        location: {
          lat: newNodeCoords.lat,
          lng: newNodeCoords.lng,
          address: `Lokasi Tiang [${newNodeCoords.lat.toFixed(5)}, ${newNodeCoords.lng.toFixed(5)}]`,
        },
        splitterRatio: newNodePorts === 16 ? '1:16' : '1:8',
        inputPowerDbm: -16.5,
        coverageRadiusMeters: 200,
        ports,
        notes: 'Baru ditambahkan via Map Editor',
      };

      const updated = [...odps, newOdp];
      onUpdateOdps(updated);
      apiService.saveOdps(updated);
      apiService.addLog('SUCCESS', 'MAP_EDITOR', `ODP Baru dibuat: ${newOdp.name} pada koordinat [${newNodeCoords.lat.toFixed(4)}, ${newNodeCoords.lng.toFixed(4)}]`);
    } else if (newNodeType === 'ONU') {
      // Create new customer and ONU device
      const newCustId = `CUST-${Math.floor(100 + Math.random() * 899)}`;
      const newCustomer: Customer = {
        id: newCustId,
        nik: '3273' + Math.floor(100000000000 + Math.random() * 900000000000),
        name: newNodeCustomer.name || 'Pelanggan Baru',
        phone: newNodeCustomer.phone || '0812' + Math.floor(10000000 + Math.random() * 90000000),
        address: `Jl. Terpasang [${newNodeCoords.lat.toFixed(5)}, ${newNodeCoords.lng.toFixed(5)}]`,
        packageId: newNodeCustomer.packageId,
        packageName: newNodeCustomer.packageId === 'PKG-50M' ? 'Family Fast 50 Mbps' : 'Home Basic 20 Mbps',
        speedMbps: newNodeCustomer.packageId === 'PKG-50M' ? 50 : 20,
        monthlyFee: newNodeCustomer.packageId === 'PKG-50M' ? 250000 : 165000,
        billingDay: 10,
        status: 'ACTIVE',
        pppoeUsername: (newNodeCustomer.name || 'user').toLowerCase().replace(/\s+/g, '_') + '@net',
        pppoePassword: 'pass_' + Math.floor(1000 + Math.random() * 9000),
        assignedIp: `10.10.100.${Math.floor(20 + Math.random() * 200)}`,
        onuSerialNumber: 'ZTEGC' + Math.random().toString(36).substring(2, 8).toUpperCase(),
        onuModel: 'ZXHN F609 V3',
        odpId: newNodeCustomer.odpId || (odps[0]?.id || 'ODP-ACEH-01'),
        odpPort: 3,
        location: {
          lat: newNodeCoords.lat,
          lng: newNodeCoords.lng,
        },
        installationDate: new Date().toISOString().split('T')[0],
        totalUnpaidBills: 0,
      };

      const newDevice: Device = {
        id: `DEV-ONU-${Date.now().toString().slice(-4)}`,
        name: `ONT-${newCustomer.name}`,
        type: 'ONU',
        ipAddress: newCustomer.assignedIp,
        serialNumber: newCustomer.onuSerialNumber,
        model: newCustomer.onuModel,
        vendor: 'ZTE',
        status: 'ONLINE',
        uptime: '0d 00h 15m',
        location: {
          lat: newNodeCoords.lat,
          lng: newNodeCoords.lng,
          address: newCustomer.address,
        },
        opticalRxPower: -19.2,
        opticalTxPower: 2.1,
        opticalTemperature: 36.5,
        opticalVoltage: 3.3,
        rxRateBps: 12000000,
        txRateBps: 4500000,
        latencyMs: 3.8,
        packetLoss: 0,
        connectedOdpId: newCustomer.odpId,
        odpPort: newCustomer.odpPort,
        customerId: newCustId,
        lastInform: 'Baru saja',
        firmwareVersion: 'V3.0.0P1T3',
        wifiSsid: `${newCustomer.name.replace(/\s+/g, '_')}_WiFi`,
        wifiClientsCount: 2,
      };

      const updatedCustomers = [...customers, newCustomer];
      const updatedDevices = [...devices, newDevice];

      onUpdateCustomers(updatedCustomers);
      onUpdateDevices(updatedDevices);
      apiService.saveCustomers(updatedCustomers);
      apiService.saveDevices(updatedDevices);

      // Also create drop wire cable automatically if odp chosen
      const targetOdp = odps.find((o) => o.id === newCustomer.odpId);
      if (targetOdp) {
        const dropCable: FiberCable = {
          id: `DROP-${Date.now()}`,
          name: `Dropwire to ${newCustomer.name}`,
          fromNodeId: targetOdp.id,
          fromNodeType: 'ODP',
          toNodeId: newDevice.id,
          toNodeType: 'ONU',
          coreCount: 1,
          tubeColor: '#64748b',
          lengthMeters: 75,
          attenuationDb: 0.05,
          status: 'NORMAL',
          path: [
            { lat: targetOdp.location.lat, lng: targetOdp.location.lng },
            { lat: newNodeCoords.lat, lng: newNodeCoords.lng },
          ],
        };
        const updatedCables = [...cables, dropCable];
        onUpdateCables(updatedCables);
        apiService.saveFiberCables(updatedCables);
      }

      apiService.addLog('SUCCESS', 'MAP_EDITOR', `Pelanggan & ONT Baru dipasang: ${newCustomer.name} (${newCustomer.onuSerialNumber})`);
    }

    setNewNodeCoords(null);
    setMode('SELECT');
    setActionFeedback('Node perangkat berhasil ditambahkan ke peta!');
    setTimeout(() => setActionFeedback(null), 3000);
  };

  // Export GeoJSON
  const handleExportGeoJson = () => {
    const featureCollection = {
      type: 'FeatureCollection',
      features: [
        ...odps.map((o) => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [o.location.lng, o.location.lat],
          },
          properties: {
            id: o.id,
            type: 'ODP',
            name: o.name,
            code: o.code,
            portsTotal: o.totalPorts,
            portsUsed: o.usedPorts,
            address: o.location.address,
          },
        })),
        ...devices.map((d) => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [d.location.lng, d.location.lat],
          },
          properties: {
            id: d.id,
            type: d.type,
            name: d.name,
            ipAddress: d.ipAddress,
            serialNumber: d.serialNumber,
            status: d.status,
            opticalRxPower: d.opticalRxPower,
          },
        })),
        ...cables.map((c) => ({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: c.path.map((p) => [p.lng, p.lat]),
          },
          properties: {
            id: c.id,
            name: c.name,
            lengthMeters: c.lengthMeters,
            coreCount: c.coreCount,
            status: c.status,
          },
        })),
      ],
    };

    const blob = new Blob([JSON.stringify(featureCollection, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `netnms_gis_network_${new Date().toISOString().split('T')[0]}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
    apiService.addLog('INFO', 'MAP_EDITOR', 'File GIS GeoJSON diekspor oleh pengguna.');
  };

  // Delete node functions
  const handleDeleteOdp = (odpId: string, odpName: string) => {
    if (confirm(`Yakin ingin menghapus ${odpName} dari peta jaringan? Kabel fiber yang terhubung ke ODP ini juga akan dihapus.`)) {
      const res = apiService.deleteOdp(odpId);
      onUpdateOdps(apiService.getOdps());
      onUpdateCables(apiService.getFiberCables());
      setSelectedOdp(null);
      setActionFeedback(res.message);
      setTimeout(() => setActionFeedback(null), 3000);
    }
  };

  const handleDeleteDevice = (deviceId: string, deviceName: string) => {
    if (confirm(`Yakin ingin menghapus perangkat ${deviceName} dari peta jaringan?`)) {
      const res = apiService.deleteDevice(deviceId);
      onUpdateDevices(apiService.getDevices());
      onUpdateCables(apiService.getFiberCables());
      setSelectedDevice(null);
      setActionFeedback(res.message);
      setTimeout(() => setActionFeedback(null), 3000);
    }
  };

  return (
    <div className="relative w-full h-[calc(100dvh-200px)] min-h-[460px] sm:h-[calc(100vh-160px)] sm:min-h-[550px] bg-slate-900 rounded-xl overflow-hidden shadow-xl border border-slate-800 flex flex-col">
      {/* Top Map Toolbar */}
      <div className="z-10 bg-slate-900/95 backdrop-blur-md px-3 sm:px-4 py-2 sm:py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 sm:gap-3 text-xs">
        {/* Left: Mode Selection */}
        <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-lg border border-slate-700">
          <button
            onClick={() => {
              setMode('SELECT');
              setCableSourceNode(null);
            }}
            className={`px-2.5 sm:px-3 py-1.5 rounded-md font-medium flex items-center gap-1 sm:gap-1.5 transition-colors cursor-pointer text-xs ${
              mode === 'SELECT'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
            }`}
            title="Klik perangkat untuk melihat informasi atau detail"
          >
            <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Pilih</span>
          </button>
          <button
            onClick={() => {
              setMode('ADD_NODE');
              setCableSourceNode(null);
            }}
            className={`px-2.5 sm:px-3 py-1.5 rounded-md font-medium flex items-center gap-1 sm:gap-1.5 transition-colors cursor-pointer text-xs ${
              mode === 'ADD_NODE'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
            }`}
            title="Klik titik di peta untuk menaruh ODP atau Pelanggan"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">+ Pasang Node</span>
            <span className="sm:hidden">+ Node</span>
          </button>
          <button
            onClick={() => {
              setMode('CONNECT_CABLE');
              setCableSourceNode(null);
            }}
            className={`px-2.5 sm:px-3 py-1.5 rounded-md font-medium flex items-center gap-1 sm:gap-1.5 transition-colors cursor-pointer text-xs ${
              mode === 'CONNECT_CABLE'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
            }`}
            title="Tarik kabel fiber antara OLT, ODC, ODP, atau Pelanggan"
          >
            <Cable className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Tarik Kabel</span>
            <span className="sm:hidden">Kabel</span>
          </button>
        </div>

        {/* Center: Search & Filters */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-[180px] max-w-full sm:max-w-md">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari ODP, Pelanggan, atau IP..."
              className="w-full pl-8 pr-6 py-1.5 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-400 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                ×
              </button>
            )}
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none hidden md:block"
          >
            <option value="ALL">Semua Node</option>
            <option value="ODP">Hanya ODP</option>
            <option value="ONU">Hanya Pelanggan (ONU)</option>
            <option value="CORE">Infrastruktur (OLT/NOC)</option>
          </select>
        </div>

        {/* Right: Layer Toggles & Export */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setShowCoverageRadius(!showCoverageRadius)}
            className={`px-2 sm:px-2.5 py-1.5 rounded-lg border text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
              showCoverageRadius
                ? 'bg-purple-950/60 border-purple-500/50 text-purple-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title="Tampilkan radius jangkauan kabel drop wire 200m dari tiang ODP"
          >
            <Radio className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Radius ODP (200m)</span>
            <span className="md:hidden">200m</span>
          </button>

          <button
            onClick={() => setMapType(mapType === 'roadmap' ? 'hybrid' : 'roadmap')}
            className="px-2 sm:px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer capitalize"
            title="Ganti tampilan peta Satelit / Roadmap"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{mapType}</span>
          </button>

          <button
            onClick={handleExportGeoJson}
            className="px-2 sm:px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
            title="Download peta jaringan FTTH format GeoJSON"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden lg:inline">Export GeoJSON</span>
          </button>
        </div>
      </div>

      {/* Mode Banner / Notification */}
      {actionFeedback && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 bg-blue-600/90 text-white px-4 py-2 rounded-full shadow-lg border border-blue-400 text-xs font-medium flex items-center gap-2 animate-bounce">
          <Activity className="w-4 h-4" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {mode === 'ADD_NODE' && (
        <div className="absolute top-16 left-4 z-20 bg-emerald-900/90 text-emerald-200 border border-emerald-600 px-3 py-1.5 rounded-lg text-xs shadow-md">
          👉 <strong>Mode Tambah:</strong> Klik pada lokasi jalan/tiang di peta untuk menempatkan perangkat baru.
        </div>
      )}

      {mode === 'CONNECT_CABLE' && (
        <div className="absolute top-16 left-4 z-20 bg-purple-900/90 text-purple-200 border border-purple-600 px-3 py-1.5 rounded-lg text-xs shadow-md">
          {cableSourceNode ? (
            <span>
              ⚡ Awal: <strong>{cableSourceNode.name}</strong>. Sekarang klik perangkat tujuan.
            </span>
          ) : (
            <span>⚡ <strong>Mode Tarik Kabel:</strong> Klik node asal (misal OLT atau ODP).</span>
          )}
        </div>
      )}

      {/* Main Google Maps Canvas */}
      <div className="w-full flex-1 relative">
        <APIProvider apiKey={apiKey} language="id" region="ID">
          <Map
            mapId="DEMO_MAP_ID"
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            defaultCenter={DEFAULT_MAP_CENTER}
            defaultZoom={15}
            mapTypeId={mapType}
            gestureHandling="greedy"
            disableDefaultUI={false}
            style={{ width: '100%', height: '100%' }}
          >
            {/* Custom Overlay Layers for Fiber Cables and ODP Coverage Circles */}
            <MapOverlayLayers
              cables={cables}
              odps={odps}
              showCoverageRadius={showCoverageRadius}
              selectedCableId={selectedCable?.id || null}
              onSelectCable={(cable) => {
                setSelectedCable(cable);
                setSelectedDevice(null);
                setSelectedOdp(null);
              }}
            />

            {/* Map click listener */}
            <MapInteractionHandler mode={mode} onMapClick={handleMapClick} />

            {/* ODP Markers */}
            {filteredOdps.map((odp) => {
              const isFull = odp.usedPorts >= odp.totalPorts;
              const isSelected = selectedOdp?.id === odp.id;

              return (
                <AdvancedMarker
                  key={odp.id}
                  position={odp.location}
                  title={`${odp.name} (${odp.usedPorts}/${odp.totalPorts} Port)`}
                  onClick={() => {
                    if (mode === 'CONNECT_CABLE') {
                      handleNodeClickForCable({
                        id: odp.id,
                        name: odp.name,
                        lat: odp.location.lat,
                        lng: odp.location.lng,
                        type: 'ODP',
                      });
                    } else {
                      setSelectedOdp(odp);
                      setSelectedDevice(null);
                      setSelectedCable(null);
                    }
                  }}
                >
                  <div
                    className={`relative group cursor-pointer transition-transform hover:scale-110 ${
                      isSelected ? 'scale-125 z-30' : 'z-10'
                    }`}
                  >
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-lg shadow-lg border-2 text-white ${
                        isFull
                          ? 'bg-rose-600 border-rose-300'
                          : 'bg-purple-600 border-purple-300'
                      }`}
                    >
                      <Radio className="w-4 h-4" />
                    </div>

                    {/* Port count badge */}
                    <div className="absolute -top-2 -right-2 bg-slate-900 text-white font-mono text-[10px] font-bold px-1.5 py-0.2 rounded-full border border-purple-400 shadow">
                      {odp.usedPorts}/{odp.totalPorts}
                    </div>

                    {/* Code label */}
                    <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-slate-900/90 text-purple-200 border border-purple-500/40 px-1.5 py-0.5 rounded text-[10px] font-mono whitespace-nowrap shadow pointer-events-none">
                      {odp.code}
                    </div>
                  </div>
                </AdvancedMarker>
              );
            })}

            {/* Device Markers (Routers, OLT, ODC, ONU/Customers) */}
            {filteredDevices.map((dev) => {
              const isSelected = selectedDevice?.id === dev.id;
              const isOnline = dev.status === 'ONLINE';
              const isWarning = dev.status === 'WARNING';
              const isOffline = dev.status === 'OFFLINE';

              const statusColor = isOnline
                ? 'bg-emerald-500 border-emerald-300'
                : isWarning
                ? 'bg-amber-500 border-amber-300'
                : 'bg-rose-500 border-rose-300';

              const icon =
                dev.type === 'ROUTER' ? (
                  <Server className="w-4 h-4" />
                ) : dev.type === 'OLT' ? (
                  <RouterIcon className="w-4 h-4" />
                ) : dev.type === 'ODC' ? (
                  <Sliders className="w-4 h-4" />
                ) : (
                  <Wifi className="w-3.5 h-3.5" />
                );

              return (
                <AdvancedMarker
                  key={dev.id}
                  position={dev.location}
                  title={`${dev.name} - ${dev.status}`}
                  onClick={() => {
                    if (mode === 'CONNECT_CABLE') {
                      handleNodeClickForCable({
                        id: dev.id,
                        name: dev.name,
                        lat: dev.location.lat,
                        lng: dev.location.lng,
                        type: dev.type,
                      });
                    } else {
                      setSelectedDevice(dev);
                      setSelectedOdp(null);
                      setSelectedCable(null);
                    }
                  }}
                >
                  <div
                    className={`relative cursor-pointer transition-transform hover:scale-110 ${
                      isSelected ? 'scale-125 z-30' : 'z-20'
                    }`}
                  >
                    <div
                      className={`flex items-center justify-center shadow-lg border-2 text-white ${
                        dev.type === 'ROUTER'
                          ? 'w-10 h-10 rounded-xl bg-blue-600 border-blue-300'
                          : dev.type === 'OLT'
                          ? 'w-9 h-9 rounded-xl bg-cyan-600 border-cyan-300'
                          : dev.type === 'ODC'
                          ? 'w-9 h-9 rounded-lg bg-indigo-600 border-indigo-300'
                          : `w-7 h-7 rounded-full ${statusColor}`
                      }`}
                    >
                      {icon}
                    </div>

                    {/* Status dot for ONU */}
                    {dev.type === 'ONU' && isWarning && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border border-slate-900 animate-ping" />
                    )}

                    {/* Name tag */}
                    <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-slate-900/90 text-slate-200 border border-slate-700 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap shadow pointer-events-none">
                      {dev.type === 'ONU' ? dev.name.replace('ONT-', '') : dev.name.split(' ')[0]}
                    </div>
                  </div>
                </AdvancedMarker>
              );
            })}
          </Map>
        </APIProvider>

        {/* Legend Overlay at bottom right */}
        <div className="absolute bottom-4 right-4 z-10 bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-slate-800 text-xs shadow-xl hidden sm:block">
          <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Legenda Jaringan FTTH
          </div>
          <div className="space-y-1.5 text-slate-300">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-blue-600 flex items-center justify-center text-[9px] text-white">R</span>
              <span>NOC &amp; Core Router</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-cyan-600 flex items-center justify-center text-[9px] text-white">O</span>
              <span>OLT (Optical Line Terminal)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-indigo-600 flex items-center justify-center text-[9px] text-white">D</span>
              <span>ODC (Distribution Cabinet)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-purple-600 flex items-center justify-center text-[9px] text-white">P</span>
              <span>ODP (Optical Distribution Point)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
              <span>Pelanggan (ONU Online)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
              <span>Pelanggan (Redaman &gt; -27 dBm)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
              <span>Pelanggan (Offline / LOS Putus)</span>
            </div>
          </div>
        </div>

        {/* Selected Entity Details Drawer (Bottom or Side) */}
        {selectedOdp && (
          <div className="absolute inset-x-2 bottom-2 max-h-[62vh] sm:inset-auto sm:top-4 sm:left-4 sm:w-80 sm:max-h-[85%] z-20 bg-slate-900/95 backdrop-blur-md rounded-xl border border-purple-500/50 p-4 text-xs text-slate-200 shadow-2xl overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-purple-400 font-bold">
                  {selectedOdp.code}
                </div>
                <h4 className="text-base font-bold text-white">{selectedOdp.name}</h4>
              </div>
              <button
                onClick={() => setSelectedOdp(null)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="py-2.5 space-y-2 border-b border-slate-800 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Port:</span>
                <span className="font-semibold">{selectedOdp.totalPorts} Port (Splitter {selectedOdp.splitterRatio})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Port Terpakai:</span>
                <span className="font-semibold text-purple-300">
                  {selectedOdp.usedPorts} / {selectedOdp.totalPorts} ({Math.round((selectedOdp.usedPorts / selectedOdp.totalPorts) * 100)}%)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Input Power (ODC):</span>
                <span className="font-mono text-emerald-400">{selectedOdp.inputPowerDbm} dBm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Alamat:</span>
                <span className="text-right text-slate-300 truncate max-w-[170px]" title={selectedOdp.location.address}>
                  {selectedOdp.location.address}
                </span>
              </div>
            </div>

            {/* Ports Matrix */}
            <div className="mt-3">
              <div className="font-semibold text-slate-300 mb-2 flex items-center justify-between">
                <span>Daftar Port Splitter ({selectedOdp.ports.length})</span>
                <span className="text-[10px] text-slate-400">Status &amp; Redaman</span>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {selectedOdp.ports.map((port) => (
                  <div
                    key={port.portNumber}
                    className={`flex items-center justify-between p-2 rounded border text-[11px] ${
                      port.status === 'USED'
                        ? 'bg-slate-800/80 border-slate-700'
                        : port.status === 'DAMAGED'
                        ? 'bg-rose-950/40 border-rose-800/50'
                        : 'bg-emerald-950/20 border-emerald-900/40'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-400 w-5">P{port.portNumber}</span>
                      <div>
                        <div className="font-medium text-slate-200">
                          {port.customerName || (port.status === 'DAMAGED' ? 'Port Rusak / Kotor' : 'Tersedia (Kosong)')}
                        </div>
                        {port.customerId && (
                          <div className="text-[10px] text-slate-400 font-mono">{port.customerId}</div>
                        )}
                      </div>
                    </div>
                    <div>
                      {port.opticalLossDbm ? (
                        <span
                          className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                            port.opticalLossDbm < -27
                              ? 'bg-rose-900/60 text-rose-300'
                              : 'bg-emerald-900/60 text-emerald-300'
                          }`}
                        >
                          {port.opticalLossDbm} dBm
                        </span>
                      ) : (
                        <span className="text-emerald-400 text-[10px]">Tersedia</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 pt-3 border-t border-slate-800 flex gap-2">
              <button
                onClick={() => {
                  setMode('CONNECT_CABLE');
                  handleNodeClickForCable({
                    id: selectedOdp.id,
                    name: selectedOdp.name,
                    lat: selectedOdp.location.lat,
                    lng: selectedOdp.location.lng,
                    type: 'ODP',
                  });
                }}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1 cursor-pointer"
              >
                <Cable className="w-3.5 h-3.5" />
                <span>Tarik Kabel Drop</span>
              </button>

              <button
                onClick={() => handleDeleteOdp(selectedOdp.id, selectedOdp.name)}
                title="Hapus tiang ODP ini dari peta"
                className="bg-rose-950/70 hover:bg-rose-900 border border-rose-800 text-rose-300 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus ODP</span>
              </button>
            </div>
          </div>
        )}

        {selectedDevice && (
          <div className="absolute inset-x-2 bottom-2 max-h-[62vh] sm:inset-auto sm:top-4 sm:left-4 sm:w-80 sm:max-h-[85%] z-20 bg-slate-900/95 backdrop-blur-md rounded-xl border border-blue-500/50 p-4 text-xs text-slate-200 shadow-2xl overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      selectedDevice.status === 'ONLINE'
                        ? 'bg-emerald-900/60 text-emerald-300'
                        : selectedDevice.status === 'WARNING'
                        ? 'bg-amber-900/60 text-amber-300'
                        : 'bg-rose-900/60 text-rose-300'
                    }`}
                  >
                    {selectedDevice.status}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">{selectedDevice.type}</span>
                </div>
                <h4 className="text-base font-bold text-white mt-1">{selectedDevice.name}</h4>
              </div>
              <button
                onClick={() => setSelectedDevice(null)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* TR-069 Optical Telemetry if ONU */}
            {selectedDevice.type === 'ONU' && (
              <div className="my-3 p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/80 space-y-2">
                <div className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                  <span>Telemetri GenieACS (TR-069)</span>
                  <span className="text-[10px] text-slate-400">{selectedDevice.lastInform}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                    <div className="text-slate-400 text-[10px]">RX Power (Optik)</div>
                    <div
                      className={`text-sm font-mono font-bold ${
                        (selectedDevice.opticalRxPower || 0) < -27
                          ? 'text-rose-400'
                          : (selectedDevice.opticalRxPower || 0) < -24
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {selectedDevice.opticalRxPower} dBm
                    </div>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                    <div className="text-slate-400 text-[10px]">TX Power (Laser)</div>
                    <div className="text-sm font-mono font-bold text-blue-400">
                      {selectedDevice.opticalTxPower} dBm
                    </div>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                    <div className="text-slate-400 text-[10px]">Suhu ONT</div>
                    <div className="text-sm font-mono text-slate-200">
                      {selectedDevice.opticalTemperature}°C
                    </div>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                    <div className="text-slate-400 text-[10px]">Tegangan</div>
                    <div className="text-sm font-mono text-slate-200">
                      {selectedDevice.opticalVoltage} V
                    </div>
                  </div>
                </div>

                <div className="text-[11px] space-y-1 pt-1 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Serial Number (SN):</span>
                    <span className="font-mono text-purple-300">{selectedDevice.serialNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Model &amp; Vendor:</span>
                    <span>{selectedDevice.vendor} {selectedDevice.model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Wi-Fi SSID:</span>
                    <span className="text-emerald-300 font-medium">{selectedDevice.wifiSsid}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Klien Aktif:</span>
                    <span>{selectedDevice.wifiClientsCount} perangkat terhubung</span>
                  </div>
                </div>
              </div>
            )}

            {/* General Specs */}
            <div className="py-2 space-y-1.5 text-[11px] border-b border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-400">IP Address:</span>
                <span className="font-mono text-blue-300">{selectedDevice.ipAddress}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">MAC Address:</span>
                <span className="font-mono">{selectedDevice.macAddress || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Uptime:</span>
                <span>{selectedDevice.uptime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Latency / Ping:</span>
                <span className="font-mono text-emerald-400">{selectedDevice.latencyMs} ms</span>
              </div>
            </div>

            {/* Quick Actions (Reboot, Refresh, Kick) */}
            <div className="mt-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  disabled={actionLoading}
                  onClick={async () => {
                    setActionLoading(true);
                    const res = await apiService.rebootOnt(selectedDevice.id);
                    setActionLoading(false);
                    setActionFeedback(res.message);
                    setTimeout(() => setActionFeedback(null), 3000);
                  }}
                  className="bg-amber-600/80 hover:bg-amber-600 text-white p-2 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                  title="Kirim instruksi TR-069 Reboot ke ONT melalui GenieACS"
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>Reboot TR-069</span>
                </button>

                <button
                  disabled={actionLoading}
                  onClick={async () => {
                    setActionLoading(true);
                    const res = await apiService.refreshDeviceParameters(selectedDevice.id);
                    setActionLoading(false);
                    setActionFeedback(res.message);
                    setTimeout(() => setActionFeedback(null), 3000);
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 p-2 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                  title="Update ulang nilai Rx Power & Uptime dari ONT"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Optik</span>
                </button>
              </div>

              {selectedDevice.customerId && (
                <button
                  onClick={() => {
                    const cust = customers.find((c) => c.id === selectedDevice.customerId);
                    if (cust) {
                      apiService.toggleCustomerIsolir(cust.id);
                      onUpdateCustomers(apiService.getCustomers());
                      setActionFeedback(`Status pelanggan ${cust.name} diperbarui.`);
                      setTimeout(() => setActionFeedback(null), 2500);
                    }
                  }}
                  className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 py-1.5 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Toggle Isolir / Aktifkan Pelanggan</span>
                </button>
              )}

              <button
                onClick={() => handleDeleteDevice(selectedDevice.id, selectedDevice.name)}
                title="Hapus node perangkat ini dari peta"
                className="w-full bg-rose-950/70 hover:bg-rose-900 border border-rose-800 text-rose-300 py-1.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors mt-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Node Perangkat Dari Peta</span>
              </button>
            </div>
          </div>
        )}

        {selectedCable && (
          <div className="absolute inset-x-2 bottom-2 max-h-[62vh] sm:inset-auto sm:top-4 sm:left-4 sm:w-80 sm:max-h-[85%] z-20 bg-slate-900/95 backdrop-blur-md rounded-xl border border-blue-500/50 p-4 text-xs text-slate-200 shadow-2xl overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-mono uppercase text-blue-400">Jalur Kabel Fiber</span>
                <h4 className="text-base font-bold text-white">{selectedCable.name}</h4>
              </div>
              <button
                onClick={() => setSelectedCable(null)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="py-2.5 space-y-1.5 text-[11px] border-b border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-400">Panjang Kabel:</span>
                <span className="font-semibold text-white">{selectedCable.lengthMeters} meter</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Kapasitas Core:</span>
                <span className="font-semibold">{selectedCable.coreCount} Core</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Estimasi Redaman:</span>
                <span className="font-mono text-emerald-400">{selectedCable.attenuationDb} dB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status Fisik:</span>
                <span
                  className={`font-semibold ${
                    selectedCable.status === 'NORMAL'
                      ? 'text-emerald-400'
                      : selectedCable.status === 'DEGRADED'
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  {selectedCable.status}
                </span>
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  const updated = cables.filter((c) => c.id !== selectedCable.id);
                  onUpdateCables(updated);
                  apiService.saveFiberCables(updated);
                  setSelectedCable(null);
                  setActionFeedback('Kabel berhasil dihapus dari peta.');
                  setTimeout(() => setActionFeedback(null), 2500);
                }}
                className="w-full bg-rose-900/60 hover:bg-rose-900 text-rose-200 border border-rose-700 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Jalur Kabel</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Node Modal */}
      {newNodeCoords && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 text-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Pasang Perangkat Baru</h3>
                  <div className="text-xs text-slate-400 font-mono">
                    Lat: {newNodeCoords.lat.toFixed(6)}, Lng: {newNodeCoords.lng.toFixed(6)}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setNewNodeCoords(null)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Tipe Perangkat Jaringan</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewNodeType('ODP')}
                    className={`p-2.5 rounded-lg border flex items-center gap-2 cursor-pointer ${
                      newNodeType === 'ODP'
                        ? 'bg-purple-900/60 border-purple-500 text-purple-200'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    <Radio className="w-4 h-4" />
                    <div className="text-left">
                      <div className="font-bold">ODP Tiang</div>
                      <div className="text-[10px]">Optical Distribution Point</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewNodeType('ONU')}
                    className={`p-2.5 rounded-lg border flex items-center gap-2 cursor-pointer ${
                      newNodeType === 'ONU'
                        ? 'bg-emerald-900/60 border-emerald-500 text-emerald-200'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    <Wifi className="w-4 h-4" />
                    <div className="text-left">
                      <div className="font-bold">Pelanggan Baru</div>
                      <div className="text-[10px]">CPE ONT / ONU</div>
                    </div>
                  </button>
                </div>
              </div>

              {newNodeType === 'ODP' ? (
                <>
                  <div>
                    <label className="block text-slate-400 mb-1">Nama / Kode ODP</label>
                    <input
                      type="text"
                      value={newNodeName}
                      onChange={(e) => setNewNodeName(e.target.value)}
                      placeholder="Contoh: ODP-MRD-02/08"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Kapasitas Port Splitter</label>
                    <select
                      value={newNodePorts}
                      onChange={(e) => setNewNodePorts(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <option value={8}>8 Port (Splitter 1:8 PLC)</option>
                      <option value={16}>16 Port (Splitter 1:16 PLC)</option>
                      <option value={24}>24 Port (Splitter 1:24)</option>
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-slate-400 mb-1">Nama Lengkap Pelanggan</label>
                    <input
                      type="text"
                      value={newNodeCustomer.name}
                      onChange={(e) =>
                        setNewNodeCustomer({ ...newNodeCustomer, name: e.target.value })
                      }
                      placeholder="Contoh: Doni Perkasa"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">No. WhatsApp / HP</label>
                    <input
                      type="text"
                      value={newNodeCustomer.phone}
                      onChange={(e) =>
                        setNewNodeCustomer({ ...newNodeCustomer, phone: e.target.value })
                      }
                      placeholder="Contoh: 08123456789"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 mb-1">Paket Langganan</label>
                      <select
                        value={newNodeCustomer.packageId}
                        onChange={(e) =>
                          setNewNodeCustomer({ ...newNodeCustomer, packageId: e.target.value })
                        }
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="PKG-20M">Home Basic 20 Mbps</option>
                        <option value="PKG-50M">Family Fast 50 Mbps</option>
                        <option value="PKG-100M">Gamer 100 Mbps</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Sambungkan ke ODP</label>
                      <select
                        value={newNodeCustomer.odpId}
                        onChange={(e) =>
                          setNewNodeCustomer({ ...newNodeCustomer, odpId: e.target.value })
                        }
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="">Pilih ODP Terdekat</option>
                        {odps.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name} ({o.usedPorts}/{o.totalPorts})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setNewNodeCoords(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg text-xs font-medium cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleCreateNode}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-xs font-semibold cursor-pointer shadow-lg"
              >
                Simpan ke Peta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
