

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapPin, TrendingUp, Truck, DollarSign, Layers, Globe, Zap, RotateCw, Maximize, ZoomIn, Box, Sun, Cloud } from 'lucide-react';
import { ReplenishmentRecord } from '../types';

// --- Data Constants: Full 50 States ---
const US_STATES = [
  { id: 'AL', name: 'Alabama', lat: 32.806671, lon: -86.791130, sales: 5000, region: 'East' },
  { id: 'AK', name: 'Alaska', lat: 61.370716, lon: -152.404419, sales: 2000, region: 'West' },
  { id: 'AZ', name: 'Arizona', lat: 33.729759, lon: -111.431221, sales: 8000, region: 'West' },
  { id: 'AR', name: 'Arkansas', lat: 34.969704, lon: -92.373123, sales: 4000, region: 'Central' },
  { id: 'CA', name: 'California', lat: 36.116203, lon: -119.681564, sales: 45000, region: 'West' },
  { id: 'CO', name: 'Colorado', lat: 39.059811, lon: -105.311104, sales: 7000, region: 'West' },
  { id: 'CT', name: 'Connecticut', lat: 41.597782, lon: -72.755371, sales: 6500, region: 'East' },
  { id: 'DE', name: 'Delaware', lat: 39.318523, lon: -75.507141, sales: 3000, region: 'East' },
  { id: 'FL', name: 'Florida', lat: 27.766279, lon: -81.686783, sales: 22000, region: 'East' },
  { id: 'GA', name: 'Georgia', lat: 33.040619, lon: -83.643074, sales: 11000, region: 'East' },
  { id: 'HI', name: 'Hawaii', lat: 21.094318, lon: -157.498337, sales: 4500, region: 'West' },
  { id: 'ID', name: 'Idaho', lat: 44.240459, lon: -114.478828, sales: 3000, region: 'West' },
  { id: 'IL', name: 'Illinois', lat: 40.349457, lon: -88.986137, sales: 18000, region: 'Central' },
  { id: 'IN', name: 'Indiana', lat: 39.849426, lon: -86.258278, sales: 9000, region: 'Central' },
  { id: 'IA', name: 'Iowa', lat: 42.011539, lon: -93.210526, sales: 4000, region: 'Central' },
  { id: 'KS', name: 'Kansas', lat: 38.526600, lon: -96.726486, sales: 3500, region: 'Central' },
  { id: 'KY', name: 'Kentucky', lat: 37.668140, lon: -84.670067, sales: 5500, region: 'East' },
  { id: 'LA', name: 'Louisiana', lat: 31.169546, lon: -91.867805, sales: 6000, region: 'Central' },
  { id: 'ME', name: 'Maine', lat: 44.693947, lon: -69.381927, sales: 2000, region: 'East' },
  { id: 'MD', name: 'Maryland', lat: 39.063946, lon: -76.802101, sales: 7500, region: 'East' },
  { id: 'MA', name: 'Massachusetts', lat: 42.230171, lon: -71.530106, sales: 9000, region: 'East' },
  { id: 'MI', name: 'Michigan', lat: 43.326618, lon: -84.536095, sales: 9500, region: 'East' },
  { id: 'MN', name: 'Minnesota', lat: 45.694454, lon: -93.900192, sales: 6000, region: 'Central' },
  { id: 'MS', name: 'Mississippi', lat: 32.741646, lon: -89.678696, sales: 3000, region: 'Central' },
  { id: 'MO', name: 'Missouri', lat: 38.456085, lon: -92.288368, sales: 6500, region: 'Central' },
  { id: 'MT', name: 'Montana', lat: 46.921925, lon: -110.454353, sales: 2000, region: 'West' },
  { id: 'NE', name: 'Nebraska', lat: 41.125370, lon: -98.268082, sales: 2500, region: 'Central' },
  { id: 'NV', name: 'Nevada', lat: 38.313515, lon: -117.055374, sales: 5000, region: 'West' },
  { id: 'NH', name: 'New Hampshire', lat: 43.452492, lon: -71.563896, sales: 2500, region: 'East' },
  { id: 'NJ', name: 'New Jersey', lat: 40.298904, lon: -74.521011, sales: 12000, region: 'East' },
  { id: 'NM', name: 'New Mexico', lat: 34.840515, lon: -106.248482, sales: 3000, region: 'West' },
  { id: 'NY', name: 'New York', lat: 42.165726, lon: -74.948051, sales: 38000, region: 'East' },
  { id: 'NC', name: 'North Carolina', lat: 35.630066, lon: -79.806419, sales: 10500, region: 'East' },
  { id: 'ND', name: 'North Dakota', lat: 47.528912, lon: -99.784012, sales: 1500, region: 'Central' },
  { id: 'OH', name: 'Ohio', lat: 40.388783, lon: -82.764915, sales: 12000, region: 'East' },
  { id: 'OK', name: 'Oklahoma', lat: 35.565342, lon: -96.928917, sales: 4500, region: 'Central' },
  { id: 'OR', name: 'Oregon', lat: 44.572021, lon: -122.070938, sales: 6000, region: 'West' },
  { id: 'PA', name: 'Pennsylvania', lat: 40.590752, lon: -77.209755, sales: 14000, region: 'East' },
  { id: 'RI', name: 'Rhode Island', lat: 41.680893, lon: -71.511780, sales: 2000, region: 'East' },
  { id: 'SC', name: 'South Carolina', lat: 33.856892, lon: -80.945007, sales: 7000, region: 'East' },
  { id: 'SD', name: 'South Dakota', lat: 44.299782, lon: -99.438828, sales: 1500, region: 'Central' },
  { id: 'TN', name: 'Tennessee', lat: 35.747845, lon: -86.692345, sales: 8500, region: 'East' },
  { id: 'TX', name: 'Texas', lat: 31.054487, lon: -97.563461, sales: 29000, region: 'Central' },
  { id: 'UT', name: 'Utah', lat: 40.150032, lon: -111.862434, sales: 4000, region: 'West' },
  { id: 'VT', name: 'Vermont', lat: 44.045876, lon: -72.710686, sales: 1500, region: 'East' },
  { id: 'VA', name: 'Virginia', lat: 37.769337, lon: -78.169968, sales: 9500, region: 'East' },
  { id: 'WA', name: 'Washington', lat: 47.400902, lon: -121.490494, sales: 15000, region: 'West' },
  { id: 'WV', name: 'West Virginia', lat: 38.491226, lon: -80.954456, sales: 3000, region: 'East' },
  { id: 'WI', name: 'Wisconsin', lat: 44.268543, lon: -89.616508, sales: 6500, region: 'Central' },
  { id: 'WY', name: 'Wyoming', lat: 42.755966, lon: -107.302490, sales: 1000, region: 'West' }
];

const WAREHOUSES = {
    WEST: { id: 'WEST', name: 'West Hub (LA)', lat: 34.0522, lon: -118.2437 },
    EAST: { id: 'EAST', name: 'East Hub (NJ)', lat: 40.7357, lon: -74.1724 },
};

// --- 3D Engine Types ---
interface Point3D { x: number; y: number; z: number; }
interface GlobePoint extends Point3D { 
    lat?: number; 
    lon?: number; 
    size?: number; 
    color?: string; // Hex color
    type?: 'land' | 'cloud' | 'data' | 'hub' | 'star'; 
    data?: any;
    opacity?: number;
}

// --- Constants ---
const BASE_RADIUS = 180; // Bigger earth
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 800;
const ROTATION_SPEED = 0.0005;

// --- Helper: Biome & Land Simulation ---
// Returns a color string based on Lat/Lon to simulate Earth biomes
const getBiomeColor = (lat: number, lon: number): string | null => {
    // 1. Continent Approximate Bounds (Simple Box Checks for Performance)
    let isLand = false;
    
    // North America
    if (lat > 15 && lat < 75 && lon > -170 && lon < -50) isLand = true;
    // South America
    else if (lat > -60 && lat < 15 && lon > -90 && lon < -30) isLand = true;
    // Europe
    else if (lat > 35 && lat < 70 && lon > -10 && lon < 50) isLand = true;
    // Africa
    else if (lat > -35 && lat < 35 && lon > -20 && lon < 55) isLand = true;
    // Asia
    else if (lat > 5 && lat < 75 && lon > 55 && lon < 180) isLand = true;
    // Australia
    else if (lat > -45 && lat < -10 && lon > 110 && lon < 155) isLand = true;
    // Japan/Islands
    else if (lat > 30 && lat < 45 && lon > 130 && lon < 145) isLand = true;

    if (!isLand) return null; // Ocean

    // 2. Biome Coloring based on Latitude (and some noise logic if we had perlin)
    const absLat = Math.abs(lat);
    
    // Polar Ice (White/Blueish)
    if (absLat > 60) return '#f8fafc'; // Slate-50
    // Tundra/Boreal (Dark Green/Grey)
    if (absLat > 50) return '#3f6212'; // Lime-800
    // Temperate (Green)
    if (absLat > 35) return '#4d7c0f'; // Lime-700
    // Desert Belts (Tan/Brown) - approx lat 20-30
    if (absLat > 15 && absLat < 35) return '#d97706'; // Amber-600 (Sandy)
    // Tropics (Lush Green)
    return '#15803d'; // Green-700
};

// Convert Lat/Lon to 3D Sphere Vector
const latLonToVector3 = (lat: number, lon: number, radius: number): Point3D => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = (radius * Math.sin(phi) * Math.sin(theta));
    const y = (radius * Math.cos(phi));
    return { x, y, z };
};

// 3D Projection
const project = (p: Point3D, scale: number, width: number, height: number, perspective: number = 800) => {
    const d = perspective / (perspective - p.z);
    return {
        x: p.x * d * scale + width / 2,
        y: p.y * d * scale + height / 2,
        scale: d * scale,
        visible: p.z > -100 // Horizon culling
    };
};

interface GeoSalesCommandProps {
  records?: ReplenishmentRecord[];
}

export const GeoSalesCommand: React.FC<GeoSalesCommandProps> = ({ records }) => {
  const [eastCoastAlloc, setEastCoastAlloc] = useState(0); 
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Camera & Interaction
  const [rotation, setRotation] = useState({ x: 0.4, y: 4.2 }); // Focused on NA
  const [zoom, setZoom] = useState(1.2);
  const [hoveredInfo, setHoveredInfo] = useState<{ x: number, y: number, data: any } | null>(null);

  // Interaction Refs
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const velocity = useRef({ x: 0, y: 0 });
  const autoRotate = useRef(true);
  const animationRef = useRef<number | null>(null);

  // --- Logic ---
  const totalSales = US_STATES.reduce((acc, s) => acc + s.sales, 0);
  const eastSales = US_STATES.filter(s => s.region === 'East').reduce((acc, s) => acc + s.sales, 0);
  
  const savings = useMemo(() => {
      const eastUnitsFulfilledFromEast = Math.min(eastSales, totalSales * (eastCoastAlloc / 100));
      const saving = eastUnitsFulfilledFromEast * 3.5;
      const transferCost = (totalSales * (eastCoastAlloc / 100)) * 0.8;
      return Math.max(0, saving - transferCost);
  }, [eastCoastAlloc, eastSales, totalSales]);

  const timeSaved = useMemo(() => {
      if (totalSales === 0) return 0;
      const eastUnitsFulfilledFromEast = Math.min(eastSales, totalSales * (eastCoastAlloc / 100));
      const totalDaysSaved = eastUnitsFulfilledFromEast * 3.0;
      return totalDaysSaved / totalSales;
  }, [eastCoastAlloc, eastSales, totalSales]);

  // --- Globe Generation (Land Particles) ---
  const globePoints = useMemo(() => {
      const points: GlobePoint[] = [];
      const samples = 6000; // High density for solid look
      const phi = Math.PI * (3 - Math.sqrt(5));
      
      for (let i = 0; i < samples; i++) {
          const y = 1 - (i / (samples - 1)) * 2;
          const radiusAtY = Math.sqrt(1 - y * y);
          const theta = phi * i;
          const x = Math.cos(theta) * radiusAtY;
          const z = Math.sin(theta) * radiusAtY;
          
          const lat = Math.asin(y) * (180 / Math.PI);
          const lon = Math.atan2(z, -x) * (180 / Math.PI);

          const color = getBiomeColor(lat, lon);
          
          if (color) {
              // Only add points if they are land
              points.push({ 
                  x: x * BASE_RADIUS, 
                  y: y * BASE_RADIUS, 
                  z: z * BASE_RADIUS,
                  type: 'land',
                  color: color,
                  opacity: 1, // Solid land
                  size: 1.8 // Slightly overlapping points for solid surface
              });
          }
      }
      return points;
  }, []);

  // --- Cloud Layer Generation ---
  const cloudPoints = useMemo(() => {
      const points: GlobePoint[] = [];
      const samples = 500;
      const phi = Math.PI * (3 - Math.sqrt(5));
      
      for (let i = 0; i < samples; i++) {
          const y = 1 - (i / (samples - 1)) * 2;
          // Banding logic: Clouds mostly in tropics and temperate storm tracks
          const lat = Math.asin(y) * (180 / Math.PI);
          if (Math.abs(lat) > 20 && Math.abs(lat) < 50 || Math.abs(lat) < 10) {
              const radiusAtY = Math.sqrt(1 - y * y);
              const theta = phi * i + Math.random(); // Randomize a bit
              const x = Math.cos(theta) * radiusAtY;
              const z = Math.sin(theta) * radiusAtY;
              
              points.push({ 
                  x: x * (BASE_RADIUS + 15), // Higher altitude
                  y: y * (BASE_RADIUS + 15), 
                  z: z * (BASE_RADIUS + 15),
                  type: 'cloud',
                  color: '#ffffff',
                  opacity: 0.4,
                  size: Math.random() * 4 + 2
              });
          }
      }
      return points;
  }, []);

  // --- Stars Background ---
  const stars = useMemo(() => {
      const s: Point3D[] = [];
      for(let i=0; i<300; i++) {
          s.push({
              x: (Math.random() - 0.5) * 3000,
              y: (Math.random() - 0.5) * 3000,
              z: (Math.random() - 0.5) * 3000 - 1000 
          });
      }
      return s;
  }, []);

  // --- Render Loop ---
  useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const render = () => {
          ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
          
          // Physics: Inertia & Rotation
          if (!isDragging.current) {
              if (autoRotate.current) {
                  setRotation(r => ({ ...r, y: r.y + (ROTATION_SPEED * 0.5) }));
              } else {
                  setRotation(r => ({ x: r.x + velocity.current.x, y: r.y + velocity.current.y }));
                  velocity.current.x *= 0.92; 
                  velocity.current.y *= 0.92;
                  if (Math.abs(velocity.current.x) < 0.0001 && Math.abs(velocity.current.y) < 0.0001) {
                      // autoRotate.current = true; // Optional auto-resume
                  }
              }
          }

          // 1. Draw Stars (Far Background)
          stars.forEach(star => {
              const proj = project(star, 1, CANVAS_WIDTH, CANVAS_HEIGHT, 1000);
              ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.5 + 0.1})`;
              ctx.beginPath();
              ctx.arc(proj.x, proj.y, Math.random() * 1.5, 0, Math.PI * 2);
              ctx.fill();
          });

          // 2. Draw Atmosphere Halo (Behind Globe)
          const cx = CANVAS_WIDTH / 2;
          const cy = CANVAS_HEIGHT / 2;
          const r = BASE_RADIUS * zoom;
          const haloGrad = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * 1.4);
          haloGrad.addColorStop(0, 'rgba(56, 189, 248, 0.1)'); // Sky-400
          haloGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.05)');
          haloGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = haloGrad;
          ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

          // 3. Draw Ocean Base (Solid Sphere)
          // Gradient simulates Day/Night
          // Sun is roughly top-left (x: -1, y: -1, z: 1)
          const oceanGrad = ctx.createRadialGradient(cx - r*0.3, cy - r*0.3, r * 0.1, cx, cy, r);
          oceanGrad.addColorStop(0, '#1e3a8a'); // Blue-900 (Deep Ocean Lit)
          oceanGrad.addColorStop(1, '#020617'); // Slate-950 (Deep Ocean Shadow)
          
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fillStyle = oceanGrad;
          ctx.fill();

          // Helper: 3D Rotation
          const rotatePoint = (p: Point3D, rotX: number, rotY: number) => {
              let x = p.x * Math.cos(rotY) - p.z * Math.sin(rotY);
              let z = p.x * Math.sin(rotY) + p.z * Math.cos(rotY);
              let y = p.y * Math.cos(rotX) - z * Math.sin(rotX);
              z = p.y * Math.sin(rotX) + z * Math.cos(rotX);
              return { x, y, z };
          };

          // Sun Vector (Static relative to viewer for consistent lighting look)
          const sunVec = { x: -0.5, y: -0.5, z: 1 }; // Light coming from top-left-front
          // Normalize
          const mag = Math.sqrt(sunVec.x*sunVec.x + sunVec.y*sunVec.y + sunVec.z*sunVec.z);
          sunVec.x /= mag; sunVec.y /= mag; sunVec.z /= mag;

          // 4. Prepare Points (Land + Clouds + Data)
          const renderList: any[] = [];

          // Land
          globePoints.forEach(p => {
              const rp = rotatePoint(p, rotation.x, rotation.y);
              if (rp.z > -50) { // Culling
                  const proj = project(rp, zoom, CANVAS_WIDTH, CANVAS_HEIGHT);
                  
                  // Lighting Calculation: Dot Product of Normal (rp normalized) and SunVec
                  const nx = rp.x / BASE_RADIUS;
                  const ny = rp.y / BASE_RADIUS;
                  const nz = rp.z / BASE_RADIUS;
                  
                  // Diffuse light (0 to 1)
                  let dot = nx * sunVec.x + ny * sunVec.y + nz * sunVec.z;
                  dot = Math.max(0.1, dot); // Ambient light floor
                  
                  renderList.push({
                      ...proj,
                      color: p.color,
                      alpha: 1, // Solid land
                      size: p.size! * proj.scale,
                      zOrder: rp.z,
                      type: 'land',
                      lightness: dot // Pass light intensity
                  });
              }
          });

          // Clouds (Rotate slightly differently for parallax)
          const cloudRotY = rotation.y + (Date.now() * 0.00005); // Slow drift
          cloudPoints.forEach(p => {
              const rp = rotatePoint(p, rotation.x, cloudRotY);
              if (rp.z > -50) {
                  const proj = project(rp, zoom, CANVAS_WIDTH, CANVAS_HEIGHT);
                  renderList.push({
                      ...proj,
                      color: '#ffffff',
                      alpha: 0.3,
                      size: p.size! * proj.scale,
                      zOrder: rp.z + 5, // Above land
                      type: 'cloud'
                  });
              }
          });

          // Data Spikes
          const itemsToDraw = [
              ...US_STATES.map(s => ({ ...s, type: 'data' })),
              { ...WAREHOUSES.WEST, type: 'hub' },
              ...(eastCoastAlloc > 0 ? [{ ...WAREHOUSES.EAST, type: 'hub' }] : [])
          ];

          const spikeLines: any[] = [];

          itemsToDraw.forEach(item => {
              const basePos = latLonToVector3(item.lat, item.lon, BASE_RADIUS);
              const height = item.type === 'data' ? (Math.sqrt((item as any).sales) / 15) + 5 : 15; 
              const tipPos = latLonToVector3(item.lat, item.lon, BASE_RADIUS + height);
              
              const rBase = rotatePoint(basePos, rotation.x, rotation.y);
              const rTip = rotatePoint(tipPos, rotation.x, rotation.y);

              if (rBase.z > -80) {
                  const pBase = project(rBase, zoom, CANVAS_WIDTH, CANVAS_HEIGHT);
                  const pTip = project(rTip, zoom, CANVAS_WIDTH, CANVAS_HEIGHT);
                  
                  const color = item.type === 'hub' 
                      ? (item.id === 'EAST' ? '#d8b4fe' : '#60a5fa') 
                      : ((item as any).sales > 20000 ? '#f87171' : (item as any).sales > 5000 ? '#fbbf24' : '#34d399');

                  spikeLines.push({ pBase, pTip, color, alpha: 0.8, zOrder: rBase.z });

                  renderList.push({
                      x: pTip.x, y: pTip.y,
                      size: item.type === 'hub' ? 5 * zoom : 2.5 * zoom,
                      color: '#ffffff',
                      alpha: 1,
                      zOrder: rTip.z + 10,
                      type: 'interactive',
                      data: item,
                      glow: color
                  });
              }
          });

          // Sort by Z for painter's algo
          renderList.sort((a, b) => a.zOrder - b.zOrder);
          const sortedSpikes = spikeLines.sort((a, b) => a.zOrder - b.zOrder);

          // 5. Draw Loop
          
          // Draw Land & Clouds
          renderList.forEach(item => {
              if (item.type === 'interactive') return; // Draw later

              ctx.beginPath();
              ctx.arc(item.x, item.y, item.size, 0, Math.PI * 2);
              
              if (item.type === 'land') {
                  // Apply lighting to color
                  // Simple hack: overlay black with alpha based on lightness inverse
                  ctx.fillStyle = item.color;
                  ctx.globalAlpha = 1;
                  ctx.fill();
                  
                  // Shadow overlay
                  if (item.lightness < 1) {
                      ctx.fillStyle = '#000000';
                      ctx.globalAlpha = (1 - item.lightness) * 0.8; // Max shadow 80%
                      ctx.fill();
                  }
              } else {
                  ctx.fillStyle = item.color;
                  ctx.globalAlpha = item.alpha;
                  ctx.fill();
              }
              ctx.globalAlpha = 1;
          });

          // Draw Spikes
          sortedSpikes.forEach(line => {
              ctx.beginPath();
              ctx.moveTo(line.pBase.x, line.pBase.y);
              ctx.lineTo(line.pTip.x, line.pTip.y);
              ctx.strokeStyle = line.color;
              ctx.lineWidth = 2 * zoom;
              ctx.lineCap = 'round';
              ctx.shadowColor = line.color;
              ctx.shadowBlur = 5;
              ctx.stroke();
              ctx.shadowBlur = 0;
          });

          // Draw Interactive Dots (Top Layer)
          let closestDist = 20;
          let closestData = null;

          renderList.filter(i => i.type === 'interactive').forEach(item => {
              // Hover Logic
              const dx = lastMouse.current.x - item.x;
              const dy = lastMouse.current.y - item.y;
              const dist = Math.sqrt(dx*dx + dy*dy);
              
              const isHovered = dist < closestDist;
              if (isHovered) {
                  closestDist = dist;
                  closestData = { x: item.x, y: item.y, data: item.data };
              }

              // Draw Dot
              ctx.fillStyle = isHovered ? '#ffffff' : item.glow;
              ctx.beginPath();
              ctx.arc(item.x, item.y, isHovered ? item.size * 1.5 : item.size, 0, Math.PI * 2);
              ctx.fill();
              
              // Ring
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.arc(item.x, item.y, isHovered ? item.size * 2 : item.size * 1.5, 0, Math.PI * 2);
              ctx.stroke();
          });

          setHoveredInfo(closestData);

          // 6. Draw Arcs (Logistics)
          if (eastCoastAlloc > 0) {
              const wHub = rotatePoint(latLonToVector3(WAREHOUSES.WEST.lat, WAREHOUSES.WEST.lon, BASE_RADIUS), rotation.x, rotation.y);
              const eHub = rotatePoint(latLonToVector3(WAREHOUSES.EAST.lat, WAREHOUSES.EAST.lon, BASE_RADIUS), rotation.x, rotation.y);
              
              if (wHub.z > -50 && eHub.z > -50) {
                  const p1 = project(wHub, zoom, CANVAS_WIDTH, CANVAS_HEIGHT);
                  const p2 = project(eHub, zoom, CANVAS_WIDTH, CANVAS_HEIGHT);
                  
                  ctx.beginPath();
                  ctx.moveTo(p1.x, p1.y);
                  const cpX = (p1.x + p2.x) / 2;
                  const cpY = (p1.y + p2.y) / 2 - 80 * zoom; 
                  ctx.quadraticCurveTo(cpX, cpY, p2.x, p2.y);
                  
                  const gradient = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
                  gradient.addColorStop(0, "#60a5fa");
                  gradient.addColorStop(1, "#d8b4fe");
                  ctx.strokeStyle = gradient;
                  ctx.lineWidth = 3;
                  ctx.setLineDash([5, 5]);
                  ctx.lineDashOffset = -Date.now() / 20; 
                  ctx.shadowColor = '#8b5cf6';
                  ctx.shadowBlur = 10;
                  ctx.stroke();
                  ctx.setLineDash([]);
                  ctx.shadowBlur = 0;
              }
          }

          animationRef.current = requestAnimationFrame(render);
      };

      animationRef.current = requestAnimationFrame(render);
      return () => {
          if (animationRef.current) cancelAnimationFrame(animationRef.current);
      };
  }, [rotation, zoom, eastCoastAlloc]);

  // --- Interaction Handlers ---
  const handleMouseDown = (e: React.MouseEvent) => {
      isDragging.current = true;
      autoRotate.current = false;
      velocity.current = { x: 0, y: 0 };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      lastMouse.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };

      if (isDragging.current) {
          const deltaX = e.movementX;
          const deltaY = e.movementY;
          setRotation(r => ({ x: r.x + deltaY * 0.005, y: r.y + deltaX * 0.005 }));
          velocity.current = { x: deltaY * 0.005, y: deltaX * 0.005 };
      }
  };

  const handleMouseUp = () => isDragging.current = false;
  const handleWheel = (e: React.WheelEvent) => {
      e.preventDefault(); 
      setZoom(z => Math.min(Math.max(0.8, z + e.deltaY * -0.001), 3.0));
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col gap-6 animate-fade-in pb-10">
        
        {/* Header */}
        <div className="glass-panel p-6 rounded-3xl border border-white/5 flex justify-between items-center bg-slate-900 relative overflow-hidden shrink-0">
            <div className="absolute inset-0 bg-grid-pattern opacity-20"></div>
            <div className="relative z-10">
                <h2 className="text-2xl font-black text-white flex items-center gap-3 text-glow">
                    <Globe className="text-blue-400" size={28} />
                    全息销售指挥室 (RealEarth 3D)
                </h2>
                <p className="text-xs text-slate-400 font-mono mt-1">Satellite View & Logistics Command</p>
            </div>
            <div className="flex gap-4 relative z-10">
                <div className="bg-slate-800 p-3 rounded-xl border border-white/10 flex flex-col items-center min-w-[120px]">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">总订单量</span>
                    <span className="text-xl font-black text-white font-mono">{totalSales.toLocaleString()}</span>
                </div>
                <div className="bg-slate-800 p-3 rounded-xl border border-white/10 flex flex-col items-center min-w-[120px]">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">美东占比</span>
                    <span className="text-xl font-black text-indigo-400 font-mono">{((eastSales/totalSales)*100).toFixed(1)}%</span>
                </div>
            </div>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-hidden">
            
            {/* 3D Map Area */}
            <div className="flex-1 glass-panel rounded-3xl border border-white/5 bg-black relative overflow-hidden flex items-center justify-center group shadow-2xl">
                {/* Space Background */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#0f172a_0%,_#000000_100%)]"></div>
                
                {/* 3D Canvas */}
                <canvas 
                    ref={canvasRef}
                    width={CANVAS_WIDTH}
                    height={CANVAS_HEIGHT}
                    className="cursor-move z-10 w-full h-full object-contain"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onWheel={handleWheel}
                />

                {/* Hover Tooltip */}
                {hoveredInfo && (
                    <div 
                        className="absolute z-20 pointer-events-none animate-fade-in"
                        style={{ left: hoveredInfo.x + 20, top: hoveredInfo.y - 20 }}
                    >
                        <div className="bg-slate-900/90 backdrop-blur-md border border-white/20 p-3 rounded-xl shadow-2xl min-w-[160px]">
                            <div className="flex items-center gap-2 mb-1">
                                {hoveredInfo.data.type === 'hub' ? <Box size={14} className="text-purple-400"/> : <MapPin size={14} className="text-red-400"/>}
                                <span className="font-bold text-white text-sm">{hoveredInfo.data.name}</span>
                            </div>
                            {hoveredInfo.data.sales && (
                                <div className="text-xs text-slate-300 font-mono">
                                    Sales: <span className="text-white font-bold">{hoveredInfo.data.sales.toLocaleString()}</span>
                                </div>
                            )}
                            <div className="text-[10px] text-slate-500 mt-1">
                                {hoveredInfo.data.region} Region
                            </div>
                        </div>
                    </div>
                )}

                {/* HUD Controls */}
                <div className="absolute top-6 right-6 z-20 flex flex-col gap-2">
                    <button onClick={() => setRotation({ x: 0.4, y: 4.2 })} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors backdrop-blur-md" title="Reset View">
                        <RotateCw size={18} />
                    </button>
                    <button onClick={() => setZoom(z => Math.min(z + 0.2, 3))} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors backdrop-blur-md" title="Zoom In">
                        <ZoomIn size={18} />
                    </button>
                    <button onClick={() => setZoom(1.2)} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors backdrop-blur-md" title="Fit Screen">
                        <Maximize size={18} />
                    </button>
                </div>

                <div className="absolute bottom-6 left-6 pointer-events-none">
                    <div className="bg-slate-900/80 backdrop-blur-md p-3 rounded-xl border border-white/10 text-xs space-y-2 text-slate-300">
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-700"></div> Vegetation</div>
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-600"></div> Desert</div>
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-100"></div> Ice/Clouds</div>
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500 shadow-glow-red"></div> Sales Hotspot</div>
                    </div>
                </div>
            </div>

            {/* Simulation Controls */}
            <div className="w-full lg:w-80 glass-panel rounded-3xl border border-white/5 bg-slate-900 flex flex-col p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-l from-green-500 to-transparent opacity-50"></div>
                
                <h3 className="font-bold text-white mb-6 flex items-center gap-2">
                    <TrendingUp className="text-green-400"/> 
                    分仓收益模拟
                </h3>

                <div className="flex-1 space-y-8">
                    <div>
                        <div className="flex justify-between items-end mb-4">
                            <label className="text-xs font-bold text-slate-400 uppercase">美东仓备货比例</label>
                            <span className="text-2xl font-black text-indigo-400 font-mono">{eastCoastAlloc}%</span>
                        </div>
                        <input 
                            type="range" 
                            min="0" max="100" step="10" 
                            value={eastCoastAlloc}
                            onChange={(e) => setEastCoastAlloc(parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                        <div className="flex justify-between text-[10px] text-slate-500 mt-2 font-mono">
                            <span>0% (All West)</span>
                            <span>50%</span>
                            <span>100% (Split)</span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5 relative overflow-hidden group">
                            <div className="absolute inset-0 bg-green-500/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                            <div className="flex justify-between items-center mb-1 relative z-10">
                                <span className="text-xs text-slate-400">预计月度运费节省</span>
                                <DollarSign size={14} className="text-green-500"/>
                            </div>
                            <div className="text-3xl font-black text-white font-mono text-glow relative z-10">
                                ${savings.toLocaleString(undefined, {maximumFractionDigits: 0})}
                            </div>
                            <div className="text-[10px] text-green-400 mt-1 relative z-10">
                                {savings > 0 ? 'Projected Savings' : 'No Optimization'}
                            </div>
                        </div>

                        <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-xs text-slate-400">平均时效提升</span>
                                <Truck size={14} className="text-blue-500"/>
                            </div>
                            <div className="text-3xl font-black text-white font-mono text-glow">
                                {timeSaved.toFixed(1)} <span className="text-sm text-slate-500">Days</span>
                            </div>
                            <div className="text-[10px] text-blue-400 mt-1">
                                Faster Delivery Speed
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-yellow-900/20 border border-yellow-500/20 rounded-xl text-xs text-yellow-200 leading-relaxed">
                        <strong className="text-yellow-400 flex items-center gap-1 mb-1"><Layers size={12}/> AI 建议:</strong>
                        当前美东订单占比高达 {((eastSales/totalSales)*100).toFixed(0)}%，建议至少分拨 30% 库存至美东海外仓 (NJ/NY)。
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};