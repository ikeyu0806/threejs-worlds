import GardenExperience from '../../../shared/experiences/GardenExperience.jsx';

const world = {
  model: '/models/nocturnal-garden-1ad7dc55539e.glb',
  preview: '/previews/nocturnal-garden-fca4bf0c5960.jpg',
  alt: '藍色の花園の絵画が壁と床いっぱいに広がる展示空間',
};

export default function App() { return <GardenExperience work={world} />; }
