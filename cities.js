// All city + landmark data lives here so it's easy to edit.
//
// Per city:
//   id        - used in the URL (#/kyoto) and to match photos
//   name      - shown in the gallery
//   unlocked  - true if the city is open from the start
//   gallery   - small image shown on the home screen
//   map       - full-size artwork used for the zoomable diorama
//   mapView   - where the camera starts on the map (world units, 0,0 = centre)
//   landmarks - clickable spots on the artwork:
//       x, y   - position on the artwork, 0..1 from the bottom-left corner
//                (open the map with ?dev=1 and click to get these numbers)
//       radius - size of the clickable area, in the same 0..1 units
window.CITIES = [
  {
    id: "tokyo",
    name: "Tokyo",
    unlocked: true,
    gallery: "assets/cities/tokyo.webp",
    map: "assets/main-scene.png?v=20260423-1046",
    mapView: { x: -0.55, y: 0.3 },
    landmarks: [
      { key: "meiji", name: "Meiji Jingu", x: 0.315, y: 0.275, radius: 0.19 },
      { key: "scramble", name: "Shibuya Scramble", x: 0.515, y: 0.695, radius: 0.2 },
      { key: "sensoji", name: "Senso-ji", x: 0.55, y: 0.49, radius: 0.13 },
      { key: "cat", name: "Cat billboard", x: 0.66, y: 0.36, radius: 0.13 },
    ],
  },
  {
    id: "kyoto",
    name: "Kyoto",
    unlocked: false,
    gallery: "assets/cities/kyoto.webp",
    map: "assets/cities/kyoto.webp",
    mapView: { x: 0, y: 0 },
    landmarks: [],
  },
  {
    id: "lisbon",
    name: "Lisbon",
    unlocked: false,
    gallery: "assets/cities/lisbon.webp",
    map: "assets/cities/lisbon.webp",
    mapView: { x: 0, y: 0 },
    landmarks: [],
  },
  {
    id: "san-francisco",
    name: "San Francisco",
    unlocked: false,
    gallery: "assets/cities/san-francisco.webp",
    map: "assets/cities/san-francisco.webp",
    mapView: { x: 0, y: 0 },
    landmarks: [],
  },
];
